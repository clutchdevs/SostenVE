import type { PresenceStore } from '../../application/presence/ports.js';

/**
 * Production presence store over Upstash Redis (RF-2.5), driven through its REST
 * API with plain `fetch` (no SDK dependency; works on serverless/edge). Presence
 * is a single key per volunteer, `presence:{id}`, written with a TTL so it self-
 * expires when heartbeats stop (RF-2.5.3). Credentials come from the environment:
 * `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Selected by
 * `presence.provider: upstash`.
 */
export class UpstashPresenceStore implements PresenceStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private key(volunteerId: string): string {
    return `presence:${volunteerId}`;
  }

  /** Runs a single Redis command via the Upstash REST endpoint. */
  private async command(args: (string | number)[]): Promise<unknown> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    if (!response.ok) {
      throw new Error(`Upstash presence command failed (${response.status})`);
    }
    const data = (await response.json()) as { result?: unknown; error?: string };
    if (data.error) throw new Error(`Upstash presence error: ${data.error}`);
    return data.result;
  }

  async markOnline(volunteerId: string, ttlSeconds: number): Promise<boolean> {
    // `SET ... GET` refreshes the key + TTL and returns the previous value in one
    // round-trip: `null` means the key did not exist, i.e. a fresh online
    // transition (was offline/expired). `1` means they were already online.
    const previous = await this.command(['SET', this.key(volunteerId), '1', 'EX', ttlSeconds, 'GET']);
    return previous === null || previous === undefined;
  }

  async markOffline(volunteerId: string): Promise<void> {
    await this.command(['DEL', this.key(volunteerId)]);
  }

  async filterOnline(volunteerIds: readonly string[]): Promise<Set<string>> {
    if (volunteerIds.length === 0) return new Set();
    const result = (await this.command(['MGET', ...volunteerIds.map((id) => this.key(id))])) as
      | (string | null)[]
      | null;
    const online = new Set<string>();
    if (Array.isArray(result)) {
      volunteerIds.forEach((id, i) => {
        if (result[i] !== null && result[i] !== undefined) online.add(id);
      });
    }
    return online;
  }
}
