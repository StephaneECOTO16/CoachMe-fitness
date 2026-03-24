/**
 * src/lib/rate-limit/index.ts
 *
 * Distributed rate limiting via Upstash Redis REST API.
 *
 * Uses a simple sliding window implemented directly with Redis commands
 * instead of @upstash/ratelimit, which spawns workers incompatible
 * with Next.js Turbopack dev mode.
 *
 * Algorithm: fixed window with Redis INCR + EXPIRE.
 *  - On first request in a window: INCR creates the key, EXPIRE sets TTL.
 *  - Subsequent requests: INCR increments, key expires naturally.
 *  - Atomic via single INCR — no race conditions on increment.
 *
 * Fail policy:
 *  - Auth endpoints (login, register): FAIL CLOSED — blocked when Redis is down.
 *  - General endpoints: FAIL OPEN — allowed when Redis is down.
 */

import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

// ─── Redis client ─────────────────────────────────────────────────────────────

let redis: Redis | null = null;

try {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (err) {
  logger.error({ err: String(err) }, "Failed to initialise Upstash Redis");
}

// ─── In-memory fallback (Dev/Test or Redis down) ─────────────────────────────

interface MemoryStore {
  count: number;
  expiresAt: number;
}

const memoryStorage = new Map<string, MemoryStore>();

/**
 * Simple in-memory rate limiter that mimics Redis logic.
 */
function checkMemoryRateLimit(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const record = memoryStorage.get(key);

  if (!record || now > record.expiresAt) {
    // First request or expired window
    memoryStorage.set(key, {
      count: 1,
      expiresAt: now + windowSeconds * 1000,
    });
    return true;
  }

  record.count += 1;
  return record.count <= limit;
}

// ─── Limiter configs ──────────────────────────────────────────────────────────

interface LimiterConfig {
  /** Max requests allowed in the window */
  max: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Whether to fail closed (block) when Redis is unavailable */
  failClosed: boolean;
}

const LIMITER_CONFIGS: Record<string, LimiterConfig> = {
  auth:     { max: 5,  windowSeconds: 60,  failClosed: true  }, // 5/min — login
  register: { max: 3,  windowSeconds: 300, failClosed: true  }, // 3/5min — register
  "password-reset": { max: 3, windowSeconds: 900, failClosed: true }, // 3/15min
  api:      { max: 60, windowSeconds: 60,  failClosed: false }, // 60/min — general
};

export type LimiterType = keyof typeof LIMITER_CONFIGS;

// ─── IP extraction ────────────────────────────────────────────────────────────

/**
 * Extracts the real client IP.
 * Prefers x-real-ip (set authoritatively by Vercel/Cloudflare edge).
 * Falls back to x-forwarded-for first hop (spoofable, but better than nothing).
 */
export function getRealIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// ─── Lua script ───────────────────────────────────────────────────────────────

/**
 * Atomically increments a counter and sets its TTL on first creation.
 *
 * KEYS[1] = the rate limit key
 * ARGV[1] = window TTL in seconds
 *
 * Returns the current count after increment.
 *
 * Using Lua ensures the increment + conditional TTL set is atomic —
 * no race condition between INCR and EXPIRE across concurrent requests.
 * Compatible with Redis 2.6+ (all Upstash tiers).
 */
const INCR_WITH_TTL_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

// ─── Core check ───────────────────────────────────────────────────────────────

/**
 * Checks whether the given key has exceeded its rate limit.
 *
 * @param key   - Unique bucket key, e.g. "login:1.2.3.4" or "register:1.2.3.4"
 * @param type  - Which limiter config to use
 * @returns     true = request allowed, false = request should be blocked
 */
export async function checkRateLimit(
  key: string,
  type: LimiterType = "api"
): Promise<boolean> {
  const config = LIMITER_CONFIGS[type] ?? LIMITER_CONFIGS.api;

  if (!redis) {
    // Fallback to in-memory if Redis is not configured or failed to init
    // In production, we still prefer failClosed if configured, but for local dev
    // we allow in-memory so registration isn't blocked by missing infrastructure.
    const isDev = process.env.NODE_ENV === "development";

    if (config.failClosed && !isDev) {
      logger.warn({ key, type }, "Redis unavailable — failing closed (Production)");
      return false;
    }

    logger.info({ key, type }, "Redis unavailable — falling back to in-memory limiter");
    return checkMemoryRateLimit(`mem:${type}:${key}`, config.max, config.windowSeconds);
  }

  try {
    const redisKey = `rl:${type}:${key}`;

    // Execute Lua script: INCR + conditional EXPIRE in a single atomic op
    const count = await redis.eval(
      INCR_WITH_TTL_SCRIPT,
      [redisKey],               // KEYS
      [String(config.windowSeconds)] // ARGV
    ) as number;

    const allowed = count <= config.max;

    if (!allowed) {
      logger.warn(
        { key, type, count, max: config.max },
        "Rate limit exceeded"
      );
    }

    return allowed;
  } catch (err) {
    // Capture non-Error throws (Upstash REST errors, fetch failures, etc.)
    // by converting to string — these don't serialise with JSON.stringify
    const errStr = err instanceof Error
      ? err.message
      : String(err);

    logger.error(
      { err: errStr, key, type },
      "Rate limit check threw — applying fail policy"
    );

    // Even on error, if we are in dev, fallback to memory instead of blocking
    if (process.env.NODE_ENV === "development") {
      return checkMemoryRateLimit(`mem:${type}:${key}`, config.max, config.windowSeconds);
    }

    return !config.failClosed;
  }
}