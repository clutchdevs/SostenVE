import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * E2E for coordinator actions (issue #20): manual reassign/close, confidential
 * volunteer notes (RF-2.4) and coordinator-driven volunteer management (RF-2.3).
 * Runs against the local Supabase DB (Docker); skipped when none is reachable.
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

describe.skipIf(!dbAvailable)('coordinator actions (e2e)', () => {
  let app: Hono;
  let pg: Client;
  let signToken: typeof import('../../src/shared/security/jwt').signToken;
  const caseIds: string[] = [];
  const volunteerIds: string[] = [];

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
    if (caseIds.length) await pg.query('delete from cases where id = any($1)', [caseIds]);
    if (volunteerIds.length) await pg.query('delete from volunteers where id = any($1)', [volunteerIds]);
    await pg.end();
  });

  async function seedVolunteer(role = 'psychologist', status = 'active'): Promise<string> {
    const res = await pg.query<{ id: string }>(
      `insert into volunteers (full_name, professional_id, role, password_hash, status)
       values ('V', $1, $2, 'x', $3) returning id`,
      [`FPV-${randomUUID().slice(0, 8)}`, role, status],
    );
    const id = res.rows[0]!.id;
    volunteerIds.push(id);
    return id;
  }

  async function seedCase(status = 'pendiente', risk = 'riesgo_alto'): Promise<string> {
    const res = await pg.query<{ id: string }>(
      `insert into cases (pseudonym_id, branch, risk_level, urgency_score, status)
       values ($1, 'roja', $2, 100, $3) returning id`,
      [`pseudo-${randomUUID()}`, risk, status],
    );
    const id = res.rows[0]!.id;
    caseIds.push(id);
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

  it('lets a coordinator reassign a case to an active psychologist', async () => {
    const coord = await seedVolunteer('coordinator');
    const psy = await seedVolunteer('psychologist');
    const caseId = await seedCase('pendiente');
    const token = await tokenFor(coord, 'coordinator');

    const res = await authed(`/api/v1/cases/${caseId}/reassign`, token, {
      method: 'POST',
      body: JSON.stringify({ voluntario_id: psy }),
    });
    expect(res.status).toBe(200);

    const row = await pg.query('select status from cases where id = $1', [caseId]);
    expect(row.rows[0]?.status).toBe('asignado');
    const assign = await pg.query('select volunteer_id from assignments where case_id = $1', [caseId]);
    expect(assign.rows[0]?.volunteer_id).toBe(psy);
  });

  it('rejects reassignment to a non-psychologist (400)', async () => {
    const coord = await seedVolunteer('coordinator');
    const other = await seedVolunteer('coordinator');
    const caseId = await seedCase('pendiente');
    const res = await authed(`/api/v1/cases/${caseId}/reassign`, await tokenFor(coord, 'coordinator'), {
      method: 'POST',
      body: JSON.stringify({ voluntario_id: other }),
    });
    expect(res.status).toBe(400);
  });

  it('lets a coordinator administratively close a case and blocks re-close (409)', async () => {
    const coord = await seedVolunteer('coordinator');
    const caseId = await seedCase('pendiente');
    const token = await tokenFor(coord, 'coordinator');

    const close = await authed(`/api/v1/cases/${caseId}/coordinator-close`, token, {
      method: 'POST',
      body: JSON.stringify({ motivo: 'estancado' }),
    });
    expect(close.status).toBe(200);
    const row = await pg.query('select status from cases where id = $1', [caseId]);
    expect(row.rows[0]?.status).toBe('cerrado');

    const again = await authed(`/api/v1/cases/${caseId}/coordinator-close`, token, {
      method: 'POST',
      body: JSON.stringify({ motivo: 'otro' }),
    });
    expect(again.status).toBe(409);
  });

  it('lets a coordinator approve a pending volunteer (RF-2.3)', async () => {
    const coord = await seedVolunteer('coordinator');
    const pending = await seedVolunteer('psychologist', 'pending_approval');
    const res = await authed(`/api/v1/volunteers/${pending}/approve`, await tokenFor(coord, 'coordinator'), {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const row = await pg.query('select status from volunteers where id = $1', [pending]);
    expect(row.rows[0]?.status).toBe('active');
  });

  it('keeps coordinator notes about a volunteer confidential (RF-2.4)', async () => {
    const coord = await seedVolunteer('coordinator');
    const psy = await seedVolunteer('psychologist');
    const coordToken = await tokenFor(coord, 'coordinator');

    const add = await authed(`/api/v1/volunteers/${psy}/notes`, coordToken, {
      method: 'POST',
      body: JSON.stringify({ contenido: 'Riesgo de burnout: rotar la próxima semana.' }),
    });
    expect(add.status).toBe(201);

    const list = await authed(`/api/v1/volunteers/${psy}/notes`, coordToken);
    expect(list.status).toBe(200);
    const notes = (await list.json()) as Array<{ contenido: string }>;
    expect(notes.some((n) => n.contenido.includes('burnout'))).toBe(true);

    // A psychologist must NOT be able to read notes (confidential, RF-2.4).
    const asPsy = await authed(`/api/v1/volunteers/${psy}/notes`, await tokenFor(psy, 'psychologist'));
    expect(asPsy.status).toBe(403);
  });
});
