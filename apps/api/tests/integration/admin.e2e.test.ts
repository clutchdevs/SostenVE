import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * E2E for the admin endpoints (crisis-line CRUD + audit query) against the local
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

describe.skipIf(!dbAvailable)('admin endpoints (e2e)', () => {
  let app: Hono;
  let pg: Client;
  let signToken: typeof import('../../src/shared/security/jwt').signToken;
  const volunteerIds: string[] = [];
  const crisisLineIds: string[] = [];

  beforeAll(async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    process.env.PSEUDONYMIZATION_SALT ??= 'e2e-test-salt';
    process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 9).toString('base64');
    process.env.JWT_SECRET ??= 'test-secret-value-at-least-32-bytes-long!!';
    app = (await import('../../api/index')).default;
    signToken = (await import('../../src/shared/security/jwt')).signToken;
    pg = new Client({ connectionString: DB_URL });
    await pg.connect();
  });

  afterAll(async () => {
    if (!pg) return;
    if (crisisLineIds.length) await pg.query('delete from crisis_lines where id = any($1)', [crisisLineIds]);
    if (volunteerIds.length) await pg.query('delete from volunteers where id = any($1)', [volunteerIds]);
    await pg.end();
  });

  async function seedVolunteer(role: string): Promise<string> {
    const res = await pg.query<{ id: string }>(
      `insert into volunteers (full_name, professional_id, role, password_hash, status)
       values ('Staff', $1, $2, 'x', 'active') returning id`,
      [`FPV-${randomUUID().slice(0, 8)}`, role],
    );
    const id = res.rows[0]!.id;
    volunteerIds.push(id);
    return id;
  }

  function tokenFor(id: string, role: string) {
    return signToken({ sub: id, role, tokenVersion: 1 }, { ttlSeconds: 300, type: 'access' });
  }

  function authed(path: string, token: string, init: RequestInit = {}) {
    return app.request(path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  }

  it('lets an admin create, list, update and soft-delete a crisis line (audited)', async () => {
    const adminId = await seedVolunteer('admin');
    const token = await tokenFor(adminId, 'admin');

    const created = await authed('/api/v1/admin/crisis-lines', token, {
      method: 'POST',
      body: JSON.stringify({ nombre: 'Línea E2E', telefono: '0800-TEST', prioridad: 5 }),
    });
    expect(created.status).toBe(201);
    const line = (await created.json()) as { id: string; activa: boolean };
    crisisLineIds.push(line.id);
    expect(line.activa).toBe(true);

    const list = await authed('/api/v1/admin/crisis-lines', token);
    const lines = (await list.json()) as Array<{ id: string }>;
    expect(lines.some((l) => l.id === line.id)).toBe(true);

    const patched = await authed(`/api/v1/admin/crisis-lines/${line.id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ telefono: '0800-NEW' }),
    });
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as { telefono: string }).telefono).toBe('0800-NEW');

    const deleted = await authed(`/api/v1/admin/crisis-lines/${line.id}`, token, { method: 'DELETE' });
    expect(deleted.status).toBe(200);
    expect(((await deleted.json()) as { activa: boolean }).activa).toBe(false);

    const audit = await authed('/api/v1/admin/audit?accion=crisis_line_created', token);
    const body = (await audit.json()) as {
      total: number;
      items: Array<{ registro_afectado: string; usuario_nombre: string | null; usuario_cedula: string | null }>;
    };
    expect(typeof body.total).toBe('number');
    const entry = body.items.find((e) => e.registro_afectado === line.id);
    expect(entry).toBeTruthy();
    // The actor is resolved to a name + distinguishing cédula/credential.
    expect(entry?.usuario_nombre).toBe('Staff');
    expect(entry?.usuario_cedula).toBeTruthy();
  });

  it('blocks a non-admin from the admin endpoints (403)', async () => {
    const psyId = await seedVolunteer('psychologist');
    const res = await authed('/api/v1/admin/crisis-lines', await tokenFor(psyId, 'psychologist'), {
      method: 'POST',
      body: JSON.stringify({ nombre: 'X', telefono: 'Y' }),
    });
    expect(res.status).toBe(403);
  });
});
