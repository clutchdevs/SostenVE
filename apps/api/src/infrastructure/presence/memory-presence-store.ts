import type { PresenceStore } from '../../application/presence/ports';

/**
 * In-memory presence store for local dev and tests. Holds each volunteer's
 * online expiry in a process-local map. NOT suitable for serverless production
 * (every instance would keep its own map) — use {@link UpstashPresenceStore}
 * there. Selected by `presence.provider: memory`.
 */
export class MemoryPresenceStore implements PresenceStore {
  private readonly expiries = new Map<string, number>();

  async markOnline(volunteerId: string, ttlSeconds: number): Promise<void> {
    this.expiries.set(volunteerId, Date.now() + ttlSeconds * 1000);
  }

  async markOffline(volunteerId: string): Promise<void> {
    this.expiries.delete(volunteerId);
  }

  async filterOnline(volunteerIds: readonly string[]): Promise<Set<string>> {
    const now = Date.now();
    const online = new Set<string>();
    for (const id of volunteerIds) {
      const expiry = this.expiries.get(id);
      if (expiry === undefined) continue;
      if (expiry > now) online.add(id);
      else this.expiries.delete(id); // prune expired entries lazily
    }
    return online;
  }
}
