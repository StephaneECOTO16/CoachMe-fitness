/**
 * src/instrumentation.ts
 *
 * Next.js instrumentation hook — runs once when the server starts,
 * before any request is handled. We use it to validate all required
 * environment variables so a misconfigured deployment fails immediately
 * with a clear error rather than crashing on the first request.
 *
 * Requires experimental.instrumentationHook: true in next.config.ts
 */

export async function register() {
  // Only run on the Node.js runtime (not edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // This import validates all env vars and throws if any are missing
    await import("@/lib/env");
  }
}
