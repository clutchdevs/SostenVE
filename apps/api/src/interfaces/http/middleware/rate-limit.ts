import type { MiddlewareHandler } from 'hono';
import { TooManyRequestsError } from '../../../shared/errors/api-error';
import { createRateLimiter, type RateLimiterStore } from '../../../shared/rate-limit/rate-limiter';

export interface RateLimitMiddlewareOptions {
  limit: number;
  windowMs: number;
  store?: RateLimiterStore;
  /** Derives the rate-limit key from the request (default: client IP). */
  keyGenerator?: (clientIp: string, path: string) => string;
}

function clientIpOf(forwardedFor: string | undefined): string {
  // x-forwarded-for may be a comma-separated list; the client is the first entry.
  return forwardedFor?.split(',')[0]?.trim() || 'unknown';
}

/**
 * Per-IP rate limiting. Throws {@link TooManyRequestsError} (429) when exceeded.
 * Used on intake routes so nobody can flood the high-risk queue with fake requests.
 */
export function rateLimit(options: RateLimitMiddlewareOptions): MiddlewareHandler {
  const limiter = createRateLimiter(options);
  const keyGenerator = options.keyGenerator ?? ((ip, path) => `${path}:${ip}`);

  return async (c, next) => {
    const ip = clientIpOf(c.req.header('x-forwarded-for'));
    const key = keyGenerator(ip, new URL(c.req.url).pathname);
    const result = await limiter.check(key);

    c.header('X-RateLimit-Remaining', String(result.remaining));
    if (!result.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAtMs - Date.now()) / 1000));
      c.header('Retry-After', String(retryAfterSeconds));
      throw new TooManyRequestsError('Too many requests', retryAfterSeconds);
    }
    await next();
  };
}
