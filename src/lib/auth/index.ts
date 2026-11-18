/**
 * src/lib/auth/index.ts
 *
 * Authentication utilities:
 *  - JWT signing / verification
 *  - Password hashing via bcrypt
 *  - Token extraction from HTTP-only cookies ONLY
 *    (localStorage is never used — it is accessible to XSS attacks)
 *  - requireAuth() guard for route handlers
 *
 * The token flow:
 *  1. Login  → server signs JWT → sets HttpOnly cookie → returns user JSON (NO token in body)
 *  2. Client → reads user state from /api/auth/me (cookie sent automatically)
 *  3. Every API request → requireAuth() reads the cookie server-side
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string; // UUID string
  role: "PROSPECT" | "COACH" | "ADMIN";
  email: string;
  name: string | null;
  avatar: string | null;
  /** "Remember me" session: persistent cookie with a long, sliding lifetime. */
  remember?: boolean;
}

/** Decoded token, including the standard JWT timestamps (seconds). */
type DecodedJwt = JwtPayload & { iat?: number; exp?: number };

export interface AuthOptions {
  /**
   * If provided, the request is rejected unless the user's role
   * is included in this list.
   */
  allowedRoles?: Array<"PROSPECT" | "COACH" | "ADMIN">;

  /**
   * When true (default), COACH users are rejected if their
   * CoachProfile.status !== 'APPROVED'.
   * Set to false for endpoints that pending coaches must access
   * (e.g. media upload, profile setup).
   */
  checkCoachStatus?: boolean;
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

/**
 * Signs a JWT containing the user's identity claims.
 * Default expiry: 7 days — long enough for comfort, short enough to limit damage.
 */
export function signJwt(
  payload: JwtPayload,
  expiresIn: string | number = "7d"
): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Verifies a JWT and returns the decoded payload.
 * Returns null for any invalid / expired token rather than throwing,
 * so callers can handle gracefully without try/catch boilerplate.
 */
export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    // expired, malformed, wrong signature — all treated the same
    return null;
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

/** Name of the HttpOnly session cookie. Single source of truth. */
export const SESSION_COOKIE = "session_token";

/** Cookie options shared between set and delete operations. */
const COOKIE_OPTIONS = {
  httpOnly: true, // JavaScript cannot read this — XSS cannot steal it
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod
  sameSite: "lax" as const, // CSRF mitigation for cross-site navigations
  path: "/",
  // maxAge is set dynamically based on 'rememberMe'
} as const;

// ─── Session lifetime ─────────────────────────────────────────────────────────
//
// Sessions use a *sliding* expiration: /api/auth/me (called every time the
// app or the installed PWA is opened or brought back to the foreground)
// re-issues the token once it is older than SESSION_REFRESH_AFTER. An active
// user is therefore never logged out; only REMEMBER_TTL of inactivity ends
// a remembered session.

/** Remembered sessions (default on mobile/PWA): 60 days since last use. */
const REMEMBER_TTL_SECONDS = 60 * 24 * 60 * 60;
/** Non-remembered sessions: 1 day since last use, cookie dropped on browser close. */
const SESSION_TTL_SECONDS = 24 * 60 * 60;
/** Re-issue the token at most every 12 hours. */
const SESSION_REFRESH_AFTER_SECONDS = 12 * 60 * 60;

/**
 * Sets the session cookie in a Next.js route handler response.
 * Prefer issueSession() / reissueSession(), which keep token and cookie
 * lifetimes consistent.
 */
export async function setSessionCookie(token: string, rememberMe: boolean = false): Promise<void> {
  const cookieStore = await cookies();

  // Remembered: persistent cookie that survives closing the app/browser.
  // Otherwise omit maxAge so it is a pure session cookie the browser clears on close.
  cookieStore.set(SESSION_COOKIE, token, {
    ...COOKIE_OPTIONS,
    ...(rememberMe ? { maxAge: REMEMBER_TTL_SECONDS } : {}),
  });
}

/** Whether a decoded token belongs to a "remember me" session. */
function isRememberedSession(decoded: DecodedJwt): boolean {
  if (typeof decoded.remember === "boolean") return decoded.remember;
  // Tokens issued before the `remember` claim existed: long-lived ones
  // (30-day "remember me" logins, 7-day re-issues) are treated as remembered.
  if (decoded.iat && decoded.exp) return decoded.exp - decoded.iat > 2 * 24 * 60 * 60;
  return true;
}

function stripJwtTimestamps(decoded: DecodedJwt): JwtPayload {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { iat, exp, ...claims } = decoded;
  return claims;
}

/** Signs a new session token and sets the matching cookie. */
export async function issueSession(claims: JwtPayload, remember: boolean): Promise<void> {
  const token = signJwt(
    { ...stripJwtTimestamps(claims), remember },
    remember ? REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS,
  );
  await setSessionCookie(token, remember);
}

/** Reads and verifies the current request's session cookie, if any. */
async function readSessionCookie(): Promise<DecodedJwt | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE)?.value;
    return raw ? (verifyJwt(raw) as DecodedJwt | null) : null;
  } catch {
    return null;
  }
}

/**
 * Re-issues the session with fresh claims (name, avatar, role...) while
 * keeping the current session's persistence. Use after profile updates
 * instead of signJwt + setSessionCookie, which would silently turn a
 * remembered session into a short browser-session one.
 */
export async function reissueSession(claims: JwtPayload): Promise<void> {
  const current = await readSessionCookie();
  await issueSession(claims, current ? isRememberedSession(current) : true);
}

/**
 * Sliding expiration: renews the session when the current token is older
 * than SESSION_REFRESH_AFTER_SECONDS. Called from /api/auth/me.
 */
export async function refreshSessionIfStale(freshClaims: JwtPayload): Promise<void> {
  const current = await readSessionCookie();
  if (!current?.iat) return;
  if (Date.now() / 1000 - current.iat < SESSION_REFRESH_AFTER_SECONDS) return;
  await issueSession(freshClaims, isRememberedSession(current));
}

/**
 * Clears the session cookie (logout).
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}

/**
 * Reads the raw JWT string from the HttpOnly cookie.
 * Falls back to the Authorization header for API clients
 * (mobile apps, external integrations) that cannot use cookies.
 *
 * Priority: Cookie > Authorization header
 */
export async function getTokenFromRequest(
  req: Request | NextRequest
): Promise<string | null> {
  // 1. HTTP-only cookie (primary — browser clients)
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE);
    if (cookie?.value) return cookie.value;
  } catch {
    // cookies() throws outside of server component / route handler context.
    // Fall through to header check.
  }

  // 2. Authorization header (secondary — API / mobile clients)
  const authHeader = req.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme === "Bearer" && token) return token;

  return null;
}

// ─── Route guard ──────────────────────────────────────────────────────────────

/**
 * Route handler guard. Extracts and verifies the session token,
 * enforces role restrictions, and optionally checks coach approval status.
 *
 * Returns the decoded JwtPayload on success, or null if unauthorised.
 *
 * @example
 *   const payload = await requireAuth(req, { allowedRoles: ['ADMIN'] });
 *   if (!payload) return unauthorised();
 */
export async function requireAuth(
  req: Request | NextRequest,
  options: AuthOptions = {}
): Promise<JwtPayload | null> {
  const { allowedRoles, checkCoachStatus = true } = options;

  const rawToken = await getTokenFromRequest(req);
  if (!rawToken) return null;

  const payload = verifyJwt(rawToken);
  if (!payload) return null;

  // Role gate — explicit allowlist
  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    logger.warn({ userId: payload.userId, role: payload.role, allowedRoles }, "Role gate rejected");
    return null;
  }

  // Account status gate — re-checked on every request (not just at login) so
  // a mid-session deactivation/deletion takes effect immediately instead of
  // waiting for the JWT to expire.
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      isActive: true,
      deletedAt: true,
      passwordChangedAt: true,
      coachProfile: { select: { status: true } },
    },
  });

  if (!user || user.deletedAt || !user.isActive) {
    logger.warn({ userId: payload.userId }, "Account inactive or deleted — access denied");
    return null;
  }

  // Password changed/reset after this token was issued → session revoked
  // (logs out every other device). JWT iat is in whole seconds, so compare
  // at second precision: the session re-issued right after the change stays valid.
  const issuedAt = (payload as DecodedJwt).iat;
  if (
    user.passwordChangedAt &&
    issuedAt !== undefined &&
    issuedAt < Math.floor(user.passwordChangedAt.getTime() / 1000)
  ) {
    logger.info({ userId: payload.userId }, "Session issued before password change — access denied");
    return null;
  }

  // Coach approval gate — always on by default
  // This is an explicit boolean check, not a truthiness check,
  // so passing {} never accidentally skips it.
  if (payload.role === "COACH" && checkCoachStatus === true) {
    if (!user.coachProfile || user.coachProfile.status !== "APPROVED") {
      logger.warn({ userId: payload.userId }, "Coach not approved — access denied");
      return null;
    }
  }

  return payload;
}

// ─── Password utilities ───────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12; // ~250ms on modern hardware — good balance

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

// ─── Response helpers ─────────────────────────────────────────────────────────

/**
 * Standard 401 response. Keeps error messages vague to avoid
 * leaking information about why auth failed.
 */
export function unauthorised(message = "Unauthorised") {
  return Response.json(
    { success: false, error: { code: "UNAUTHORISED", message } },
    { status: 401 }
  );
}

/**
 * Standard 403 response.
 */
export function forbidden(message = "Forbidden") {
  return Response.json(
    { success: false, error: { code: "FORBIDDEN", message } },
    { status: 403 }
  );
}
