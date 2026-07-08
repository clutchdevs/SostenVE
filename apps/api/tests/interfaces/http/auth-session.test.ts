import { Hono } from 'hono';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  configureSessionValidation,
  requireAuth,
} from '../../../src/interfaces/http/middleware/auth.js';
import { errorHandler } from '../../../src/interfaces/http/middleware/error-handler.js';
import { signToken } from '../../../src/shared/security/jwt.js';

/**
 * In-place session destruction (RF-2.7): once session validation is configured,
 * a token whose version no longer matches the account's current one is rejected —
 * this is how a newer login destroys older sessions.
 */
function appWithCurrentVersion(current: number | null): Hono {
  configureSessionValidation(async () => current);
  const app = new Hono();
  app.onError(errorHandler);
  app.get('/guarded', requireAuth(), (c) => c.json({ ok: true }));
  return app;
}

async function accessTokenWithVersion(tokenVersion: number): Promise<string> {
  return signToken({ sub: 'vol-1', role: 'psychologist', tokenVersion }, { ttlSeconds: 300, type: 'access' });
}

describe('requireAuth — session version validation (RF-2.7)', () => {
  beforeAll(() => {
    process.env.JWT_SECRET ??= 'test-secret-value-at-least-32-bytes-long!!';
  });

  it('allows a token whose version matches the current one', async () => {
    const app = appWithCurrentVersion(3);
    const res = await app.request('/guarded', {
      headers: { Authorization: `Bearer ${await accessTokenWithVersion(3)}` },
    });
    expect(res.status).toBe(200);
  });

  it('rejects a token superseded by a newer login (version bumped)', async () => {
    const app = appWithCurrentVersion(4); // account moved on to v4
    const res = await app.request('/guarded', {
      headers: { Authorization: `Bearer ${await accessTokenWithVersion(3)}` },
    });
    expect(res.status).toBe(401);
  });

  it('rejects when the account no longer exists (null current version)', async () => {
    const app = appWithCurrentVersion(null);
    const res = await app.request('/guarded', {
      headers: { Authorization: `Bearer ${await accessTokenWithVersion(1)}` },
    });
    expect(res.status).toBe(401);
  });
});
