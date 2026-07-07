/**
 * Real-time presence port (RF-2.5). A volunteer is "online" while their PWA keeps
 * sending heartbeats; each heartbeat refreshes a short TTL, so a dropped tab,
 * dead battery or network loss expires the key automatically (RF-2.5.3) without
 * an explicit logout. Implemented over a shared, TTL-capable store (Upstash Redis
 * in production; an in-memory store for local dev/tests) so serverless instances
 * share the same view — see the adapters in infrastructure/presence.
 */
export interface PresenceStore {
  /**
   * Marks a volunteer online for `ttlSeconds`, refreshed on every heartbeat.
   * Returns `true` only when this call is a fresh online **transition** (the
   * volunteer was previously offline/expired), so callers can drain the queue to
   * a psychologist the moment they become available without reacting to every
   * repeated heartbeat.
   */
  markOnline(volunteerId: string, ttlSeconds: number): Promise<boolean>;
  /** Immediately marks a volunteer offline (manual pause or logout, RF-4.3.1). */
  markOffline(volunteerId: string): Promise<void>;
  /** Returns the subset of the given ids that are currently online. */
  filterOnline(volunteerIds: readonly string[]): Promise<Set<string>>;
}
