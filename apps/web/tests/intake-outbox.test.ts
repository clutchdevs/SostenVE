import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enqueueSubmission,
  flushOutbox,
  pendingCount,
  type PendingSubmission,
} from '../src/lib/intake-outbox';

const KEY = 'ppv.intakeOutbox';

function okResponse() {
  return { ok: true, status: 201, json: async () => ({}) };
}
function httpError(status: number) {
  return { ok: false, status, json: async () => ({ error: { message: 'nope' } }) };
}

describe('intake outbox (offline retry queue)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('enqueues a submission that survives in storage', () => {
    enqueueSubmission('/intake/red-branch', { contacto: '0412' });
    expect(pendingCount()).toBe(1);
    const stored = JSON.parse(window.localStorage.getItem(KEY)!) as PendingSubmission[];
    expect(stored[0]?.endpoint).toBe('/intake/red-branch');
    expect(stored[0]?.payload).toEqual({ contacto: '0412' });
  });

  it('delivers and removes queued items on a successful flush', async () => {
    enqueueSubmission('/intake/green-branch', { a: 1 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()));
    const remaining = await flushOutbox();
    expect(remaining).toBe(0);
    expect(pendingCount()).toBe(0);
  });

  it('keeps items and bumps attempts on a network failure', async () => {
    enqueueSubmission('/intake/green-branch', { a: 1 });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed to fetch')));
    const remaining = await flushOutbox();
    expect(remaining).toBe(1);
    const stored = JSON.parse(window.localStorage.getItem(KEY)!) as PendingSubmission[];
    expect(stored[0]?.attempts).toBe(1);
  });

  it('keeps items on a server (5xx) error', async () => {
    enqueueSubmission('/intake/green-branch', { a: 1 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(httpError(503)));
    expect(await flushOutbox()).toBe(1);
  });

  it('drops items on a permanent client (4xx) error to avoid infinite retries', async () => {
    enqueueSubmission('/intake/green-branch', { bad: true });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(httpError(400)));
    const remaining = await flushOutbox();
    expect(remaining).toBe(0);
    expect(pendingCount()).toBe(0);
  });

  it('is a no-op when the queue is empty', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await flushOutbox()).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
