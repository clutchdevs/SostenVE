import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * E2E for coordinator invitations (RF-2.6): an admin issues an invitation, the
 * invitee redeems the token to activate an `active` coordinator, and that
 * coordinator can then log in. Runs against the local Supabase DB (Docker);
 * skipped when no DB is reachable.
 */
/** Structured coordinator sign-up fields (RF-2.6.2) + a robust password. */
const COORD_PASSWORD = 'Str0ng-P4ssw0rd!!';
const SIGNUP_FIELDS = {
  nombres: 'Coral',
  apellidos: 'Coordinadora',
  tipo_documento: 'V',
  numero_documento: '12345678',
  telefono: '0414-1234567',
};

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

describe.skipIf(!dbAvailable)('coordinator invitations (e2e)', () => {
  let app: Hono;
  let pg: Client;
  let signToken: typeof import('../../src/shared/security/jwt').signToken;
  const volunteerIds: string[] = [];
  const emails: string[] = [];

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
    if (emails.length) await pg.query('delete from coordinator_invitations where email = any($1)', [emails]);
    if (volunteerIds.length) await pg.query('delete from volunteers where id = any($1)', [volunteerIds]);
    await pg.end();
  });

  async function seedAdmin(): Promise<string> {
    const res = await pg.query<{ id: string }>(
      `insert into volunteers (full_name, professional_id, role, password_hash, status)
       values ('Admin', $1, 'admin', 'x', 'active') returning id`,
      [`FPV-${randomUUID().slice(0, 8)}`],
    );
    const id = res.rows[0]!.id;
    volunteerIds.push(id);
    return id;
  }

  function authed(path: string, token: string, init: RequestInit = {}) {
    return app.request(path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  }

  it('issues an invitation, accepts it and lets the new coordinator log in', async () => {
    const adminId = await seedAdmin();
    const token = await signToken(
      { sub: adminId, role: 'admin', tokenVersion: 1 },
      { ttlSeconds: 300, type: 'access' },
    );
    const email = `coord-${randomUUID().slice(0, 8)}@example.com`;
    emails.push(email);

    // Admin issues the invitation and receives the raw token once.
    const invited = await authed('/api/v1/admin/coordinators/invitations', token, {
      method: 'POST',
      body: JSON.stringify({ nombre: 'Coral Coordinadora', email }),
    });
    expect(invited.status).toBe(201);
    const invitation = (await invited.json()) as { id: string; token: string; estado: string };
    expect(invitation.estado).toBe('pending');
    expect(invitation.token).toBeTruthy();

    // Invitee redeems the token (public, no auth) and activates the account.
    const accepted = await app.request('/api/v1/coordinators/accept-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: invitation.token,
        ...SIGNUP_FIELDS,
        contrasena: COORD_PASSWORD,
      }),
    });
    expect(accepted.status).toBe(201);
    const { voluntario_id } = (await accepted.json()) as { voluntario_id: string };
    volunteerIds.push(voluntario_id);

    // The new coordinator can log in.
    const login = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, contrasena: COORD_PASSWORD }),
    });
    expect(login.status).toBe(200);
    expect(((await login.json()) as { rol: string }).rol).toBe('coordinator');

    // The invitation is now consumed and cannot be reused.
    const reuse = await app.request('/api/v1/coordinators/accept-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: invitation.token,
        ...SIGNUP_FIELDS,
        contrasena: COORD_PASSWORD,
      }),
    });
    expect(reuse.status).toBe(400);
  });

  it('rejects an invalid token (400)', async () => {
    const res = await app.request('/api/v1/coordinators/accept-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'not-a-real-token',
        ...SIGNUP_FIELDS,
        contrasena: COORD_PASSWORD,
      }),
    });
    expect(res.status).toBe(400);
  });
});
