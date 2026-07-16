import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * End-to-end assignment / SLA tests against the local Supabase DB (Docker).
 * Skipped when no DB is reachable.
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

describe.skipIf(!dbAvailable)('assignment & SLA (e2e)', () => {
  let app: Hono;
  let pg: Client;
  let signToken: typeof import('../../src/shared/security/jwt.js').signToken;
  let escalateOverdueCases: typeof import('../../src/application/assignment/escalate-sla.js').escalateOverdueCases;
  let getAssignmentDeps: typeof import('../../src/interfaces/http/v1/dependencies.js').getAssignmentDeps;
  let getPresenceStore: typeof import('../../src/interfaces/http/v1/dependencies.js').getPresenceStore;
  const caseIds: string[] = [];
  const volunteerIds: string[] = [];

  beforeAll(async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    process.env.PSEUDONYMIZATION_SALT ??= 'e2e-test-salt';
    process.env.JWT_SECRET ??= 'test-secret-value-at-least-32-bytes-long!!';
    process.env.CRON_SECRET ??= 'test-cron-secret';
    app = (await import('../../api/index.js')).app;
    signToken = (await import('../../src/shared/security/jwt.js')).signToken;
    escalateOverdueCases = (await import('../../src/application/assignment/escalate-sla.js'))
      .escalateOverdueCases;
    getAssignmentDeps = (await import('../../src/interfaces/http/v1/dependencies.js')).getAssignmentDeps;
    getPresenceStore = (await import('../../src/interfaces/http/v1/dependencies.js')).getPresenceStore;
    pg = new Client({ connectionString: DB_URL });
    await pg.connect();
  });

  afterAll(async () => {
    if (!pg) return;
    if (caseIds.length) await pg.query('delete from cases where id = any($1)', [caseIds]);
    if (volunteerIds.length) await pg.query('delete from volunteers where id = any($1)', [volunteerIds]);
    await pg.end();
  });

  async function seedVolunteer(specialty = 'adultos'): Promise<string> {
    const res = await pg.query<{ id: string }>(
      `insert into volunteers (full_name, professional_id, role, password_hash, status, specialty)
       values ('Vol', $1, 'psychologist', 'x', 'active', $2) returning id`,
      [`FPV-${randomUUID().slice(0, 8)}`, specialty],
    );
    const id = res.rows[0]!.id;
    volunteerIds.push(id);
    return id;
  }

  async function seedCase(opts: {
    status: string;
    slaExpiresAt?: Date;
  }): Promise<string> {
    const res = await pg.query<{ id: string }>(
      `insert into cases (pseudonym_id, branch, risk_level, urgency_score, status, sla_expires_at)
       values ($1, 'roja', 'riesgo_alto', 100, $2, $3) returning id`,
      [`pseudo-${randomUUID()}`, opts.status, opts.slaExpiresAt?.toISOString() ?? null],
    );
    const id = res.rows[0]!.id;
    caseIds.push(id);
    return id;
  }

  function cron(secret?: string) {
    return app.request('/api/v1/cron/check-sla', {
      headers: secret ? { 'X-Cron-Secret': secret } : {},
    });
  }

  it('rejects the cron endpoint without the secret', async () => {
    expect((await cron()).status).toBe(401);
  });

  it('assigns a pending high-risk case to an active volunteer', async () => {
    const volunteerId = await seedVolunteer();
    // The assignment pool is gated on real-time presence (RF-2.5): mark the
    // volunteer online through the same store the app uses, or the case stays queued.
    await getPresenceStore().markOnline(volunteerId, 300);
    const caseId = await seedCase({ status: 'pendiente' });

    const res = await cron('test-cron-secret');
    expect(res.status).toBe(200);

    const row = await pg.query('select status from cases where id = $1', [caseId]);
    expect(row.rows[0]?.status).toBe('asignado');
    const assignment = await pg.query('select id from assignments where case_id = $1', [caseId]);
    expect(assignment.rowCount).toBe(1);
  });

  it('lets the assigned volunteer accept the case (stops the SLA)', async () => {
    const volunteerId = await seedVolunteer();
    const caseId = await seedCase({ status: 'asignado' });
    await pg.query('insert into assignments (case_id, volunteer_id) values ($1, $2)', [
      caseId,
      volunteerId,
    ]);

    const token = await signToken(
      { sub: volunteerId, role: 'psychologist', tokenVersion: 1 },
      { ttlSeconds: 300, type: 'access' },
    );
    const res = await app.request(`/api/v1/cases/${caseId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);

    const row = await pg.query('select status from cases where id = $1', [caseId]);
    expect(row.rows[0]?.status).toBe('aceptado');
    const accepted = await pg.query('select accepted_at from assignments where case_id = $1', [
      caseId,
    ]);
    expect(accepted.rows[0]?.accepted_at).not.toBeNull();
  });

  it('escalates a high-risk case whose SLA expired without acceptance', async () => {
    const volunteerId = await seedVolunteer();
    const caseId = await seedCase({
      status: 'asignado',
      slaExpiresAt: new Date(Date.now() - 60_000), // already expired
    });
    await pg.query('insert into assignments (case_id, volunteer_id) values ($1, $2)', [
      caseId,
      volunteerId,
    ]);

    const { escalated } = await escalateOverdueCases(getAssignmentDeps());
    expect(escalated).toBeGreaterThanOrEqual(1);

    const row = await pg.query('select status from cases where id = $1', [caseId]);
    expect(row.rows[0]?.status).toBe('pendiente');
    const assignment = await pg.query('select id from assignments where case_id = $1', [caseId]);
    expect(assignment.rowCount).toBe(0);
  });

  it('reassigns an escalated high-risk case to a DIFFERENT online volunteer and resets its SLA (#159)', async () => {
    const volA = await seedVolunteer();
    const volB = await seedVolunteer();
    // Both online → a reassignment target other than the one who let the SLA
    // expire is available.
    await getPresenceStore().markOnline(volA, 300);
    await getPresenceStore().markOnline(volB, 300);
    const caseId = await seedCase({
      status: 'asignado',
      slaExpiresAt: new Date(Date.now() - 60_000), // already expired
    });
    await pg.query('insert into assignments (case_id, volunteer_id) values ($1, $2)', [caseId, volA]);

    // One cron pass: escalate (revoke A) then reassign to someone else.
    expect((await cron('test-cron-secret')).status).toBe(200);

    const row = await pg.query<{ status: string; sla_expires_at: string | null }>(
      'select status, sla_expires_at from cases where id = $1',
      [caseId],
    );
    expect(row.rows[0]?.status).toBe('asignado');
    // Fresh acceptance window so it is not re-escalated instantly.
    expect(new Date(row.rows[0]!.sla_expires_at!).getTime()).toBeGreaterThan(Date.now());
    const assignment = await pg.query<{ volunteer_id: string }>(
      'select volunteer_id from assignments where case_id = $1',
      [caseId],
    );
    expect(assignment.rowCount).toBe(1);
    // Reassigned to a DIFFERENT volunteer than the one who did not accept.
    expect(assignment.rows[0]?.volunteer_id).not.toBe(volA);
  });
});
