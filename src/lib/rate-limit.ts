import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Create a new Ratelimit instance for standard API endpoints
// Limiting: 10 requests per 10 seconds per IP (sliding window)
// Adjust as needed for specific routes by creating new instances or passing config
let ratelimit: Ratelimit | null = null;

try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        ratelimit = new Ratelimit({
            redis: redis,
            limiter: Ratelimit.slidingWindow(10, '10 s'),
            analytics: true,
            prefix: '@upstash/ratelimit',
        });
    } else {
        console.warn('Rate Limiting disabled: Missing Upstash Redis credentials.');
    }
} catch (error) {
    console.error('Failed to initialize Rate Limiter:', error);
}

/**
 * Check if a request should be rate-limited.
 * @param key - Unique identifier (e.g., IP address)
 * @param limit - Max requests allowed (overrides default if needed, though currently fixed to 10/10s globally in this simplistic implementation)
 * @param windowMs - Time window in milliseconds (ignored in this simple wrapper, uses default sliding window)
 * @returns Promise<boolean> - true if allowed, false if rate-limited
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function checkRateLimit(key: string, _limit: number = 10, _windowMs: number = 60000): Promise<boolean> {
    if (!ratelimit) {
        // Fail open if Redis is not configured, to avoid blocking users
        return true;
    }

    try {
        // Use the global limiter. For more granular control (different limits per route),
        // we would need multiple limiter instances or a different API.
        // For now, we reuse the same simple interface but backed by Redis.
        const { success } = await ratelimit.limit(key);
        return success;
    } catch (error) {
        console.error('Rate limit check failed:', error);
        // Fail open on error
        return true;
    }
}
