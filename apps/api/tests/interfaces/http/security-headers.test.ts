import { describe, expect, it } from 'vitest';
import { app } from '../../../api/index.js';

describe('global security headers', () => {
  it('sets security headers on a real response', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('strict-transport-security')).toContain('max-age=');
  });
});
