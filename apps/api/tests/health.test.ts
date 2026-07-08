import { describe, expect, it } from 'vitest';
import { app } from '../api/index';

describe('GET /api/v1/health', () => {
  it('responds with ok status', async () => {
    const response = await app.request('/api/v1/health');
    expect(response.status).toBe(200);

    const body = (await response.json()) as { status: string; app: string };
    expect(body.status).toBe('ok');
    expect(body.app).toContain('PPV');
  });
});
