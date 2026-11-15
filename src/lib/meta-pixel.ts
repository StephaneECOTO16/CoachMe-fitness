/**
 * Meta (Facebook) Pixel helpers.
 *
 * The base code is injected once by <MetaPixel /> (see
 * src/components/analytics/MetaPixel.tsx). These helpers are safe to call
 * anywhere on the client: they no-op when the pixel is disabled, blocked by
 * an ad blocker, or during SSR.
 */

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

/** Pixel ID — can be overridden per environment with NEXT_PUBLIC_META_PIXEL_ID. */
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1128325623315567";

/**
 * Disabled in local development so devs don't pollute the client's ad data.
 * Set NEXT_PUBLIC_META_PIXEL_DEV=true to test locally.
 */
export const META_PIXEL_ENABLED =
  Boolean(META_PIXEL_ID) &&
  (process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_META_PIXEL_DEV === "true");

export function trackPageView(): void {
  if (!META_PIXEL_ENABLED || typeof window === "undefined") return;
  window.fbq?.("track", "PageView");
}

/**
 * Fires CompleteRegistration exactly once per created account.
 * Call it only after the register API returned success.
 *
 * - Deduplicated per user id in sessionStorage (guards double submits).
 * - Sends an eventID so the future Conversions API (server-side) can be
 *   deduplicated against this browser event by Meta.
 */
export function trackCompleteRegistration(
  userId: string,
  accountType: "PROSPECT" | "COACH"
): void {
  if (!META_PIXEL_ENABLED || typeof window === "undefined") return;

  const key = `meta_cr_${userId}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Storage unavailable (private mode) — the call site only runs once
    // per successful API response anyway, so fire without the guard.
  }

  window.fbq?.(
    "track",
    "CompleteRegistration",
    { content_name: accountType === "COACH" ? "coach" : "client", status: true },
    { eventID: `registration_${userId}` }
  );
}
