import { describe, expect, it } from 'vitest';
import { MemoryPresenceStore } from '../../../src/infrastructure/presence/memory-presence-store';

describe('MemoryPresenceStore (RF-2.5)', () => {
  it('reports a volunteer online within the TTL', async () => {
    const store = new MemoryPresenceStore();
    await store.markOnline('v1', 65);
    expect(await store.filterOnline(['v1', 'v2'])).toEqual(new Set(['v1']));
  });

  it('expires presence after the TTL', async () => {
    const store = new MemoryPresenceStore();
    await store.markOnline('v1', 0); // already expired
    expect(await store.filterOnline(['v1'])).toEqual(new Set());
  });

  it('marks a volunteer offline immediately (manual pause)', async () => {
    const store = new MemoryPresenceStore();
    await store.markOnline('v1', 65);
    await store.markOffline('v1');
    expect(await store.filterOnline(['v1'])).toEqual(new Set());
  });

  it('returns an empty set for an empty id list', async () => {
    const store = new MemoryPresenceStore();
    expect(await store.filterOnline([])).toEqual(new Set());
  });
});
