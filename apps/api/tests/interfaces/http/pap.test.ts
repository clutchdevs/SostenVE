import { describe, expect, it } from 'vitest';
import { app } from '../../../api/index';

interface PapGuide {
  id: string;
  title: string;
  summary: string;
  steps: string[];
}

describe('GET /api/v1/pap', () => {
  it('returns the versioned PAP self-help guides', async () => {
    const response = await app.request('/api/v1/pap');
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      version: string;
      updated_at: string;
      guides: PapGuide[];
    };
    expect(body.version).toBeTruthy();
    expect(body.updated_at).toBeTruthy();
    expect(body.guides.length).toBeGreaterThan(0);

    // Each guide is renderable: id, title, summary and at least one step.
    for (const guide of body.guides) {
      expect(guide.id).toBeTruthy();
      expect(guide.title).toBeTruthy();
      expect(guide.summary).toBeTruthy();
      expect(guide.steps.length).toBeGreaterThan(0);
    }
    // Guide ids are unique (stable anchors for the client).
    const ids = body.guides.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is public (no auth required)', async () => {
    const response = await app.request('/api/v1/pap');
    expect(response.status).toBe(200);
  });
});
