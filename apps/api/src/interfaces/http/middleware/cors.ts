import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';

/**
 * Strict CORS. Only the configured origins are allowed; never `*`. Origins come
 * from `security.cors` per environment (development allows localhost, production
 * only the real domain).
 */
export function buildCors(allowedOrigins: readonly string[]): MiddlewareHandler {
  const origins = [...allowedOrigins];
  return cors({
    origin: (origin) => (origins.includes(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Cron-Secret', 'Idempotency-Key', 'X-Active-Role'],
    credentials: true,
  });
}
