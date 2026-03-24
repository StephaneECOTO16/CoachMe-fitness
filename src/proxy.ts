/**
 * Next.js edge middleware — runs before every matched request.
 *
 * Responsibilities:
 *  1. i18n routing (next-intl)
 *  2. Security response headers on every response
 *  3. CSRF protection for state-changing API endpoints
 *
 * CSRF strategy:
 *  We use the "Same-Origin" check pattern:
 *  - Read-only methods (GET, HEAD, OPTIONS) are always allowed.
 *  - Mutating methods (POST, PUT, PATCH, DELETE) on /api/* must have
 *    an Origin or Referer header that matches the app's own host.
 *  - Requests without either header from a mutating method are rejected.
 *  - API clients using Authorization: Bearer are exempt because Bearer
 *    tokens cannot be set by cross-origin form submissions or img tags.
 *
 * This protects cookie-based sessions from CSRF without requiring
 * a separate CSRF token in every form.
 */

import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// ─── i18n middleware ──────────────────────────────────────────────────────────

const intlMiddleware = createMiddleware(routing);

// ─── Constants ────────────────────────────────────────────────────────────────

/** Methods that mutate server state and therefore need CSRF protection. */
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Paths that must never be CSRF-checked (e.g. webhook receivers). */
const CSRF_EXEMPT_PATHS = [
  "/api/pusher/auth", // Pusher sends its own signed requests
];

// ─── Security headers ─────────────────────────────────────────────────────────

/**
 * Applied to every response from the application.
 * These are the baseline headers required for production SaaS.
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  const h = response.headers;

  // Enforce HTTPS for 1 year, include subdomains
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // Prevent the browser from MIME-sniffing responses
  h.set("X-Content-Type-Options", "nosniff");

  // Block clickjacking — only allow framing from same origin
  h.set("X-Frame-Options", "SAMEORIGIN");

  // Control referrer information sent to third parties
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Disable browser features we don't use
  h.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // Content Security Policy
  // 'unsafe-inline' on styles is required for CSS Modules + Tailwind.
  // 'unsafe-eval' is intentionally omitted — no eval() in this app.
  h.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' blob: https://js.pusher.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `worker-src 'self' blob:`,
      `img-src 'self' data: blob: ${process.env.R2_PUBLIC_URL ?? ""} https://images.unsplash.com https://ui-avatars.com https://media.mandarafitness.com`,
      `connect-src 'self' wss://*.pusher.com https://sockjs-mt1.pusher.com https://*.r2.cloudflarestorage.com ${process.env.UPSTASH_REDIS_REST_URL ?? ""}`,
      `media-src 'self' ${process.env.R2_PUBLIC_URL ?? ""}`,
      "frame-src 'none'",
    ].join("; ")
  );

  return response;
}

// ─── CSRF check ───────────────────────────────────────────────────────────────

/**
 * Returns true if the request should be blocked as a CSRF attempt.
 *
 * Safe: GET / HEAD / OPTIONS
 * Safe: requests with Authorization: Bearer (API clients)
 * Safe: origin matches the app host
 * Blocked: mutating request with missing or mismatched origin
 */
function isCsrfViolation(req: NextRequest): boolean {
  const { method, nextUrl } = req;

  // Only mutating methods need the check
  if (!MUTATING_METHODS.has(method)) return false;

  // Only API routes use cookie auth — pages use form submissions which are fine
  if (!nextUrl.pathname.startsWith("/api/")) return false;

  // Exempt specific paths (webhooks, Pusher auth)
  if (CSRF_EXEMPT_PATHS.some((p) => nextUrl.pathname.startsWith(p))) {
    return false;
  }

  // Requests using Bearer token are API clients — not cookie-based, not CSRF-able
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) return false;

  // Extract the requesting origin
  const origin =
    req.headers.get("origin") ?? req.headers.get("referer") ?? null;

  // No origin header on a mutating cookie request → suspicious, block it
  if (!origin) return true;

  // Parse host from origin/referer and compare to our app host
  try {
    const requestingHost = new URL(origin).host;
    const appHost = new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    ).host;
    return requestingHost !== appHost;
  } catch {
    // Malformed origin header — block it
    return true;
  }
}

// ─── Main middleware ──────────────────────────────────────────────────────────

export async function proxy(req: NextRequest): Promise<NextResponse> {
  // 1. CSRF gate — before anything else
  if (isCsrfViolation(req)) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: { code: "CSRF_VIOLATION", message: "Forbidden" },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. For API routes: skip i18n, just apply security headers
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }

  // 3. For page routes: run i18n middleware then apply security headers
  const response = intlMiddleware(req) as NextResponse;
  return applySecurityHeaders(response);
}

export const config = {
  // Match all routes except Next.js internals and static files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)).*)",
  ],
};
