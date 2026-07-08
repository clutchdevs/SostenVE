import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../../../src/interfaces/http/middleware/error-handler';
import { getValidated, validateBody } from '../../../src/interfaces/http/middleware/validate';

const schema = z.object({ name: z.string().min(1) });

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler);
  app.post('/echo', validateBody(schema), (c) => c.json(getValidated(c, 'body')));
  return app;
}

function postJson(app: Hono, body: string) {
  return app.request('/echo', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('validateBody middleware', () => {
  it('passes a valid payload to the handler', async () => {
    const res = await postJson(buildApp(), JSON.stringify({ name: 'Ana' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: 'Ana' });
  });

  it('rejects an invalid shape with 400 before the handler', async () => {
    const res = await postJson(buildApp(), JSON.stringify({ name: '' }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await postJson(buildApp(), '{not json');
    expect(res.status).toBe(400);
  });
});
