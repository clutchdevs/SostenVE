import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FALLBACK_CRISIS_LINES, getCrisisLines } from '../src/lib/crisis-lines';

describe('getCrisisLines (fail-safe)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to the embedded list when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const lines = await getCrisisLines();
    expect(lines).toEqual(FALLBACK_CRISIS_LINES);
    expect(lines.active?.phone).toBeTruthy();
  });

  it('uses and caches the API response when available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          activa: { name: 'LAPSI', phone: '+58000' },
          respaldo: [{ name: 'VEN-911', phone: '911' }],
        }),
      }),
    );
    const lines = await getCrisisLines();
    expect(lines.active?.phone).toBe('+58000');
    // cached for offline reuse
    expect(window.localStorage.getItem('ppv.crisisLines')).toContain('+58000');
  });

  it('uses the cache when the API later fails', async () => {
    window.localStorage.setItem(
      'ppv.crisisLines',
      JSON.stringify({ active: { name: 'Cacheada', phone: '+58111' }, backups: [] }),
    );
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const lines = await getCrisisLines();
    expect(lines.active?.phone).toBe('+58111');
  });
});
