// Loads supabase/seed.sql into the local Supabase Postgres via psql, preserving
// UTF-8. The Supabase CLI's own seed step corrupts accented characters on Windows
// (á/é/í/ó/ú/ñ become the replacement char �), so `db:reset` runs the CLI with
// `--no-seed` and delegates seeding to this script instead.
//
// Cross-platform: Node reads the file as raw bytes and pipes them to the DB
// container's psql over stdin, so no shell redirection (which differs across
// cmd/bash/PowerShell and can re-encode) is involved.
import { readFileSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';

const container = execSync('docker ps --filter name=supabase_db_ --format "{{.Names}}"')
  .toString()
  .trim()
  .split('\n')[0];

if (!container) {
  console.error('No running "supabase_db_*" container found. Start Supabase first (npm run db:start).');
  process.exit(1);
}

const sql = readFileSync(new URL('../supabase/seed.sql', import.meta.url));
const result = spawnSync(
  'docker',
  ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
  { input: sql, stdio: ['pipe', 'inherit', 'inherit'] },
);

if (result.status === 0) console.log(`Seed loaded into ${container} (UTF-8 preserved).`);
process.exit(result.status ?? 1);
