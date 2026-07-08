import type { SupabaseClient } from '@supabase/supabase-js';
import type { IdempotencyStore } from '../../application/intake/idempotency.js';

/**
 * Idempotency store backed by the `idempotency_keys` table. Written with the
 * service client (intake is an anonymous, server-trusted operation). Expired keys
 * are treated as absent.
 */
export class SupabaseIdempotencyStore implements IdempotencyStore {
  constructor(private readonly client: SupabaseClient) {}

  async get(key: string): Promise<unknown | null> {
    const { data, error } = await this.client
      .from('idempotency_keys')
      .select('response, expires_at')
      .eq('key', key)
      .maybeSingle();
    if (error) throw new Error(`Failed to read idempotency key: ${error.message}`);
    if (!data) return null;
    const row = data as { response: unknown; expires_at: string };
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      return null;
    }
    return row.response;
  }

  async set(key: string, response: unknown, ttlMs: number): Promise<void> {
    const { error } = await this.client.from('idempotency_keys').upsert({
      key,
      response,
      expires_at: new Date(Date.now() + ttlMs).toISOString(),
    });
    if (error) throw new Error(`Failed to store idempotency key: ${error.message}`);
  }
}
