import { describe, expect, it } from 'vitest';
import app from '../../../api/index';

describe('OpenAPI document & Swagger UI', () => {
  it('serves a valid OpenAPI 3.1 document covering all endpoints', async () => {
    const res = await app.request('/api/v1/openapi.json');
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(doc.openapi).toBe('3.1.0');

    const paths = Object.keys(doc.paths);
    for (const expected of [
      '/intake/triage',
      '/intake/red-branch',
      '/intake/green-branch',
      '/crisis-lines/active',
      '/consent/active',
      '/auth/login',
      '/volunteers/register',
      '/volunteers/{id}/approve',
      '/cases',
      '/cases/{id}',
      '/cases/{id}/notes',
      '/coordinator/capacity',
      '/cron/check-sla',
    ]) {
      expect(paths).toContain(expected);
    }
  });

  it('embeds request body schemas derived from Zod', async () => {
    const res = await app.request('/api/v1/openapi.json');
    const doc = (await res.json()) as {
      paths: Record<string, { post?: { requestBody?: unknown } }>;
    };
    expect(doc.paths['/intake/triage']?.post?.requestBody).toBeDefined();
  });

  it('serves Swagger UI with a relaxed CSP', async () => {
    const res = await app.request('/api/v1/docs');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.toLowerCase()).toContain('swagger');
    expect(res.headers.get('content-security-policy')).not.toContain("default-src 'none'");
  });
});
