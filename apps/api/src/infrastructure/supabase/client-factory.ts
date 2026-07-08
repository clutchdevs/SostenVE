import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client factory.
 *
 * - `forService()`: service-role client for system operations (cron, audit,
 *   seeding). Bypasses RLS — use only for trusted server-side work.
 * - `forUser(accessToken)`: anon-key client carrying the user's JWT, so Row Level
 *   Security applies exactly as in production (idiomatic Supabase).
 *
 * Clients are created lazily so build/tests do not require real secrets.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let serviceClient: SupabaseClient | null = null;

export function forService(): SupabaseClient {
  if (serviceClient === null) {
    serviceClient = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return serviceClient;
}

export function forUser(accessToken: string): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
