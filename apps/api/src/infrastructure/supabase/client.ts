import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazy Supabase client singleton.
 *
 * Created on first use so that build and tests do not require real secrets.
 * Uses the service role key for backend access; connection pooling is handled by
 * Supabase (use the pooler URL in DATABASE_URL for direct SQL clients — see ADR-0002).
 */

let client: SupabaseClient | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseClient(): SupabaseClient {
  if (client === null) {
    client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    });
  }
  return client;
}
