import { describe, expect, it } from 'vitest';
import app from '../../../api/index';

interface ConsentBody {
  version: string;
  updated_at: string;
  text: string;
}

describe('GET /api/v1/consent/active', () => {
  it('returns the versioned psychologist consent text (RF-2.1.1)', async () => {
    const response = await app.request('/api/v1/consent/active');
    expect(response.status).toBe(200);
    const body = (await response.json()) as ConsentBody;
    expect(body.version).toBeTruthy();
    expect(body.updated_at).toBeTruthy();
    expect(body.text).toBeTruthy();
  });
});

describe('GET /api/v1/consent/requester', () => {
  it('returns the versioned requester consent notice (issue #1)', async () => {
    const response = await app.request('/api/v1/consent/requester');
    expect(response.status).toBe(200);
    const body = (await response.json()) as ConsentBody;
    expect(body.version).toBeTruthy();
    expect(body.updated_at).toBeTruthy();
    expect(body.text).toBeTruthy();
  });

  it('is public (no auth required)', async () => {
    const response = await app.request('/api/v1/consent/requester');
    expect(response.status).toBe(200);
  });
});
