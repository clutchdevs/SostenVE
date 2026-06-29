import type { MiddlewareHandler } from 'hono';
import { UnauthorizedError } from '../../../shared/errors/api-error';

/**
 * Protects cron endpoints with a shared secret (CRON_SECRET). Accepts the secret
 * via `Authorization: Bearer <secret>` (how Vercel Cron sends it when CRON_SECRET
 * is set) or an `X-Cron-Secret` header. This is NOT user authentication.
 */
export function cronAuth(): MiddlewareHandler {
  return async (c, next) => {
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      throw new Error('Missing required environment variable: CRON_SECRET');
    }
    const bearer = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
    const provided = bearer ?? c.req.header('X-Cron-Secret');
    if (provided !== expected) {
      throw new UnauthorizedError('Invalid cron secret');
    }
    await next();
  };
}
