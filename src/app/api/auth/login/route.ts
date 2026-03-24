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
      { status: 429 }
    );
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const { data, error } = await parseRequestBody(req, LoginRequestSchema);
  if (error) {
    return NextResponse.json({ success: false, error }, { status: 400 });
  }

  const { email, password } = data!;

  // ── Credential check ───────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  // Use a constant-time comparison path to prevent timing attacks:
  // always call comparePassword even if user doesn't exist
  const passwordMatch = user
    ? await comparePassword(password, user.password)
    : await comparePassword(password, "$2b$12$invalidhashfortimingattackprevention");

  if (!user || !passwordMatch) {
    // Vague message — don't reveal whether the email exists
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      },
      { status: 401 }
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

  const token = signJwt(jwtPayload);

  // Cookie is set on the response — the token never appears in the body
  await setSessionCookie(token);

  logger.info({ userId: user.id, role: user.role }, "User logged in");

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
