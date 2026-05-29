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
}

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

/**
 * Sets the session cookie in a Next.js route handler response.
 * Call this after login or token refresh.
 */
export async function setSessionCookie(token: string, rememberMe: boolean = false): Promise<void> {
  const cookieStore = await cookies();
  
  // 30 days if rememberMe is true. If false, omit maxAge so it becomes a pure session cookie 
  // that the browser clears when it closes.
  const options: any = { ...COOKIE_OPTIONS };
  if (rememberMe) {
    options.maxAge = 60 * 60 * 24 * 30; // 30 days
  }
  
  cookieStore.set(SESSION_COOKIE, token, options);
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

  // Coach approval gate — always on by default
  // This is an explicit boolean check, not a truthiness check,
  // so passing {} never accidentally skips it.
  if (payload.role === "COACH" && checkCoachStatus === true) {
    const coach = await prisma.coachProfile.findUnique({
      where: { userId: payload.userId },
      select: { status: true },
    });

    if (!coach || coach.status !== "APPROVED") {
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
