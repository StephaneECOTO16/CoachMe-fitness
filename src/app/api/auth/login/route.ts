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

  const { identifier, password, rememberMe, role } = data!;

  // ── Detect identifier type and find candidate accounts ────────────────────
  // Email and phone are unique per role, so one identifier can map to
  // several accounts (e.g. a client account AND a coach account).
  const identifierType = detectIdentifierType(identifier);
  const normalizedIdentifier = identifier.toLowerCase().trim();

  const candidates = await prisma.user.findMany({
    where:
      identifierType === "email"
        ? { email: normalizedIdentifier }
        : {
            OR: [
              { phone: normalizePhoneIdentifier(identifier) },
              { phone: identifier.trim() },
            ],
          },
    orderBy: { createdAt: "desc" },
  });

  const invalidCredentials = () =>
    // Vague message — don't reveal whether the identifier exists
    NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email/phone or password",
        },
      },
      { status: 401 },
    );

  if (candidates.length === 0) {
    // Constant-time-ish path: always run one compare
    await comparePassword(password, "$2b$12$invalidhashfortimingattackprevention");
    return invalidCredentials();
  }

  // Accounts whose password matches (each account has its own password).
  const matches = [];
  for (const candidate of candidates) {
    if (await comparePassword(password, candidate.password)) matches.push(candidate);
  }

  const roleMatches = role ? matches.filter((m) => m.role === role) : matches;
  if (roleMatches.length === 0) return invalidCredentials();

  // Prefer usable accounts; only report deleted/deactivated status when
  // every matching account is unusable.
  const usable = roleMatches.filter((m) => !m.deletedAt && m.isActive);

  if (usable.length > 1) {
    // Same identifier + same password on several accounts: let the user pick.
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ROLE_REQUIRED",
          message: "Several accounts use these credentials. Choose which one to open.",
          roles: usable.map((u) => u.role),
        },
      },
      { status: 409 },
    );
  }

  const user = usable[0] ?? roleMatches[0];

  // ── Account status gate ─────────────────────────────────────────────────────
  // Deleted/deactivated accounts authenticate correctly (right password) but
  // must not receive a session — distinct from INVALID_CREDENTIALS so the
  // client can show a clear "account disabled" message instead of "wrong password".
  if (user.deletedAt) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ACCOUNT_DELETED",
          message: "This account has been deleted",
        },
      },
      { status: 403 },
    );
  }

  if (!user.isActive) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ACCOUNT_DEACTIVATED",
          message: "This account has been deactivated",
        },
      },
      { status: 403 },
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
