import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ─── Redis client (shared with api routes) ───────────────────────────────────
const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// ─── Rate limiters ───────────────────────────────────────────────────────────

/** Login / register attempts: 5 per 15 minutes per identifier (email or IP) */
export const loginLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '15m'),
  prefix: 'rl:login',
  analytics: false,
});

/** PIN validation attempts: 5 per 10 minutes per profile */
export const pinLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '10m'),
  prefix: 'rl:pin',
  analytics: false,
});

/** General API protection: 120 requests per minute per IP */
export const apiLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(120, '1m'),
  prefix: 'rl:api',
  analytics: false,
});

/**
 * Check a rate limiter and send 429 if exceeded.
 * Returns true if the request should be blocked (caller should return early).
 */
export async function checkLimit(limiter, identifier, res) {
  try {
    const { success, reset, remaining } = await limiter.limit(identifier);
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        error: 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.',
        retryAfterSeconds: retryAfter,
      });
      return true;
    }
    return false;
  } catch {
    // Rate limiting should never crash the app; fail open
    return false;
  }
}
