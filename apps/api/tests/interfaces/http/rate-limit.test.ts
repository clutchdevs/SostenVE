import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../../../src/interfaces/http/middleware/error-handler';
import { rateLimit } from '../../../src/interfaces/http/middleware/rate-limit';

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler);
  app.use('/limited', rateLimit({ limit: 2, windowMs: 60_000 }));
  app.get('/limited', (c) => c.text('ok'));
  return app;
}

function call(app: Hono) {
  return app.request('/limited', { headers: { 'x-forwarded-for': '203.0.113.5' } });
}

describe('rateLimit middleware', () => {
  it('allows requests within the limit and blocks beyond it with 429', async () => {
    const app = buildApp();
    expect((await call(app)).status).toBe(200);
    expect((await call(app)).status).toBe(200);

    const blocked = await call(app);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).not.toBeNull();
    const body = (await blocked.json()) as { error: { code: string } };
    expect(body.error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('tracks limits independently per client IP', async () => {
    const app = buildApp();
    await call(app);
    await call(app);
    await call(app); // first IP now blocked

    const otherIp = await app.request('/limited', {
      headers: { 'x-forwarded-for': '198.51.100.9' },
    });
    expect(otherIp.status).toBe(200);
  });
});
