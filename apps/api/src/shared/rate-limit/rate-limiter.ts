/**
 * Fixed-window rate limiter.
 *
 * The store is injectable; the in-memory default is for development/tests. In
 * production (serverless) a shared store (Supabase/Upstash) is required so limits
 * hold across function instances — wired in a later block.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix epoch (ms) when the current window resets. */
  resetAtMs: number;
}

export interface RateLimiterStore {
  /** Increments the counter for `key` within a `windowMs` window and returns the new count + window reset. */
  hit(key: string, windowMs: number): Promise<{ count: number; resetAtMs: number }>;
}

export class InMemoryRateLimiterStore implements RateLimiterStore {
  private readonly windows = new Map<string, { count: number; resetAtMs: number }>();

  async hit(key: string, windowMs: number): Promise<{ count: number; resetAtMs: number }> {
    const now = Date.now();
    const existing = this.windows.get(key);
    if (!existing || existing.resetAtMs <= now) {
      const fresh = { count: 1, resetAtMs: now + windowMs };
      this.windows.set(key, fresh);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  store?: RateLimiterStore;
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const store = options.store ?? new InMemoryRateLimiterStore();
  return {
    async check(key: string): Promise<RateLimitResult> {
      const { count, resetAtMs } = await store.hit(key, options.windowMs);
      return {
        allowed: count <= options.limit,
        remaining: Math.max(0, options.limit - count),
        resetAtMs,
      };
    },
  };
}
