/**
 * Authenticates a user and opens a session via HttpOnly cookie.
 *
 * Security decisions:
 *  - The JWT is placed in an HttpOnly cookie ONLY. It is never included
 *    in the JSON response body, so client-side JS (and therefore XSS)
 *    cannot access it.
 *  - We return the user's public claims so the client can hydrate state
 *    without a second /api/auth/me request on login.
 *  - Rate limiting uses the real IP from Vercel's x-forwarded-for,
 *    verified against x-real-ip to prevent header spoofing.
 *  - Login accepts either email OR phone number as identifier.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  comparePassword,
  signJwt,
  setSessionCookie,
  type JwtPayload,
} from "@/lib/auth";
import { parseRequestBody, LoginRequestSchema } from "@/lib/validation/schemas";
import { checkRateLimit, getRealIp } from "@/lib/rate-limit";
import { getPublicUrl } from "@/lib/storage";
import { logger } from "@/lib/logger";

/**
 * Detects whether the identifier is an email or phone number.
 *
 * @param identifier - The user input (email or phone)
 * @returns "email" | "phone"
 */
function detectIdentifierType(identifier: string): "email" | "phone" {
  const trimmed = identifier.trim();

  // Email if it clearly contains @
  if (trimmed.includes("@")) return "email";

  // Accept strict E.164 (+237...) and tolerant variant without leading + (237...)
  // to handle clients that accidentally strip '+' in transport.
  const compact = trimmed.replace(/\s+/g, "");
  const phonePattern = /^\+?[1-9]\d{6,14}$/;
  if (phonePattern.test(compact)) {
    return "phone";
  }

  return "email";
}

function normalizePhoneIdentifier(identifier: string): string {
  const compact = identifier.trim().replace(/\s+/g, "");
  if (!compact) return compact;
  return compact.startsWith("+") ? compact : `+${compact}`;
}

export async function POST(req: Request) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getRealIp(req);
  const allowed = await checkRateLimit(`login:${ip}`, "auth");
  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many login attempts. Please try again in a minute.",
        },
      },
      { status: 429 },
    );
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const { data, error } = await parseRequestBody(req, LoginRequestSchema);
  if (error) {
    return NextResponse.json({ success: false, error }, { status: 400 });
  }

  const { identifier, password, rememberMe } = data!;

  // ── Detect identifier type and find user ──────────────────────────────────
  const identifierType = detectIdentifierType(identifier);
  const normalizedIdentifier = identifier.toLowerCase().trim();

  let user = null;

  if (identifierType === "email") {
    user = await prisma.user.findUnique({
      where: { email: normalizedIdentifier },
    });

    // Constant-time-ish path: always run one compare
    const passwordMatch = user
      ? await comparePassword(password, user.password)
      : await comparePassword(
          password,
          "$2b$12$invalidhashfortimingattackprevention",
        );

    if (!user || !passwordMatch) {
      // Vague message — don't reveal whether the identifier exists
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email/phone or password",
          },
        },
        { status: 401 },
      );
    }
  } else {
    // Phone lookup - tolerate legacy duplicate phone numbers by checking all matches
    const normalizedPhone = normalizePhoneIdentifier(identifier);

    const users = await prisma.user.findMany({
      where: {
        OR: [{ phone: normalizedPhone }, { phone: identifier.trim() }],
      },
      orderBy: { createdAt: "desc" },
    });

    if (users.length === 0) {
      await comparePassword(
        password,
        "$2b$12$invalidhashfortimingattackprevention",
      );
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email/phone or password",
          },
        },
        { status: 401 },
      );
    }

    for (const candidate of users) {
      if (await comparePassword(password, candidate.password)) {
        user = candidate;
        break;
      }
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email/phone or password",
          },
        },
        { status: 401 },
      );
    }
  }

  if (!user) {
    // Vague message — don't reveal whether the identifier exists
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email/phone or password",
        },
      },
      { status: 401 },
    );
  }

  // ── Sign JWT + set cookie ──────────────────────────────────────────────────
  const avatarUrl = user.avatar ? getPublicUrl(user.avatar) : null;

  const jwtPayload: JwtPayload = {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    avatar: avatarUrl,
  };

  const token = signJwt(jwtPayload, rememberMe ? "30d" : "1d");

  // Cookie is set on the response — the token never appears in the body
  await setSessionCookie(token, rememberMe);

  logger.info(
    {
      userId: user.id,
      role: user.role,
      identifierType,
    },
    `User logged in via ${identifierType}`,
  );

  // Return public user data only (no token, no password hash)
  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      avatar: avatarUrl,
    },
  });
}
