import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * End-to-end volunteer registration / login / admin flow against the local
 * Supabase DB (Docker). Skipped when no DB is reachable.
 */
const DB_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function canConnect(): Promise<boolean> {
  const probe = new Client({ connectionString: DB_URL, connectionTimeoutMillis: 1500 });
  try {
    await probe.connect();
    await probe.end();
    return true;
  } catch {
    return false;
  }
}

const dbAvailable = await canConnect();

describe.skipIf(!dbAvailable)('volunteer registration & auth (e2e)', () => {
  let app: Hono;
  let pg: Client;
  let signToken: typeof import('../../src/shared/security/jwt').signToken;
  const emails: string[] = [];

  beforeAll(async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    process.env.PSEUDONYMIZATION_SALT ??= 'e2e-test-salt';
    process.env.JWT_SECRET ??= 'test-secret-value-at-least-32-bytes-long!!';
    app = (await import('../../api/index')).default;
    signToken = (await import('../../src/shared/security/jwt')).signToken;
    pg = new Client({ connectionString: DB_URL });
    await pg.connect();
  });

  afterAll(async () => {
    if (!pg) return;
    if (emails.length) {
      await pg.query('delete from volunteers where email = any($1)', [emails]);
    }
    await pg.end();
  });

  function post(path: string, body: unknown, headers: Record<string, string> = {}) {
    return app.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  }

  async function register(email: string) {
    emails.push(email);
    return post('/api/v1/volunteers/register', {
      nombre: 'Ana Test',
      cedula_profesional: `FPV-${randomUUID().slice(0, 8)}`,
      email,
      contrasena: 'a-strong-password',
      especialidad: 'clinica',
    });
  }

  it('registers a volunteer as active (dummy FPV verifier approves)', async () => {
    const email = `vol-${randomUUID().slice(0, 8)}@example.com`;
    const res = await register(email);
    expect(res.status).toBe(202);
    const body = (await res.json()) as { voluntario_id: string; estado_validacion: string };
    expect(body.estado_validacion).toBe('validado');

    const row = await pg.query('select status from volunteers where id = $1', [body.voluntario_id]);
    expect(row.rows[0]?.status).toBe('active');
  });

  it('logs in with valid credentials and rejects a wrong password', async () => {
    const email = `vol-${randomUUID().slice(0, 8)}@example.com`;
    await register(email);

    const ok = await post('/api/v1/auth/login', { email, contrasena: 'a-strong-password' });
    expect(ok.status).toBe(200);
    expect((await ok.json() as { token: string }).token).toBeTruthy();

    const bad = await post('/api/v1/auth/login', { email, contrasena: 'wrong-password' });
    expect(bad.status).toBe(401);
  });

  it('lets an admin approve a pending volunteer and reject another', async () => {
    const adminToken = await signToken(
      { sub: randomUUID(), role: 'admin', tokenVersion: 1 },
      { ttlSeconds: 300, type: 'access' },
    );
    const auth = { Authorization: `Bearer ${adminToken}` };

    // Seed a pending volunteer directly.
    const email = `pending-${randomUUID().slice(0, 8)}@example.com`;
    emails.push(email);
    const seeded = await pg.query<{ id: string }>(
      `insert into volunteers (full_name, professional_id, email, role, password_hash, status)
       values ('Pending', $1, $2, 'psychologist', 'x', 'pending_approval') returning id`,
      [`FPV-${randomUUID().slice(0, 8)}`, email],
    );
    const id = seeded.rows[0]!.id;

    const approve = await post(`/api/v1/volunteers/${id}/approve`, {}, auth);
    expect(approve.status).toBe(200);
    const afterApprove = await pg.query('select status from volunteers where id = $1', [id]);
    expect(afterApprove.rows[0]?.status).toBe('active');

    const reject = await post(`/api/v1/volunteers/${id}/reject`, {}, auth);
    expect(reject.status).toBe(200);
    const afterReject = await pg.query('select status, token_version from volunteers where id = $1', [
      id,
    ]);
    expect(afterReject.rows[0]?.status).toBe('inactive');
    expect(afterReject.rows[0]?.token_version).toBe(2);
  });

  it('rejects admin endpoints without an admin token', async () => {
    const res = await app.request('/api/v1/volunteers', { method: 'GET' });
    expect(res.status).toBe(401);
  });
});
