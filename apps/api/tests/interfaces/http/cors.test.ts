import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { buildCors } from '../../../src/interfaces/http/middleware/cors';

function buildApp() {
  const app = new Hono();
  app.use('*', buildCors(['http://localhost:3000']));
  app.get('/x', (c) => c.text('ok'));
  return app;
}

describe('CORS middleware', () => {
  it('allows a configured origin', async () => {
    const res = await buildApp().request('/x', {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
  });

  it('does not allow an unconfigured origin', async () => {
    const res = await buildApp().request('/x', {
      headers: { Origin: 'https://evil.example' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});
