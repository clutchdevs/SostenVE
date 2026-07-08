import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * E2E for case management (psychologist) and coordinator views against the local
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

describe.skipIf(!dbAvailable)('case management & coordinator (e2e)', () => {
  let app: Hono;
  let pg: Client;
  let signToken: typeof import('../../src/shared/security/jwt.js').signToken;
  const caseIds: string[] = [];
  const volunteerIds: string[] = [];

  beforeAll(async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    process.env.PSEUDONYMIZATION_SALT ??= 'e2e-test-salt';
    process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 9).toString('base64');
    process.env.JWT_SECRET ??= 'test-secret-value-at-least-32-bytes-long!!';
    app = (await import('../../api/index.js')).app;
    signToken = (await import('../../src/shared/security/jwt.js')).signToken;
    pg = new Client({ connectionString: DB_URL });
    await pg.connect();
  });

  afterAll(async () => {
    if (!pg) return;
    if (caseIds.length) await pg.query('delete from cases where id = any($1)', [caseIds]);
    if (volunteerIds.length) await pg.query('delete from volunteers where id = any($1)', [volunteerIds]);
    await pg.end();
  });

  async function seedVolunteer(): Promise<string> {
    const res = await pg.query<{ id: string }>(
      `insert into volunteers (full_name, professional_id, role, password_hash, status)
       values ('Psy', $1, 'psychologist', 'x', 'active') returning id`,
      [`FPV-${randomUUID().slice(0, 8)}`],
    );
    const id = res.rows[0]!.id;
    volunteerIds.push(id);
    return id;
  }

  async function seedCase(riskLevel = 'riesgo_moderado'): Promise<string> {
    const res = await pg.query<{ id: string }>(
      `insert into cases (pseudonym_id, branch, risk_level, urgency_score, status)
       values ($1, 'verde', $2, 10, 'asignado') returning id`,
      [`pseudo-${randomUUID()}`, riskLevel],
    );
    const id = res.rows[0]!.id;
    caseIds.push(id);
    return id;
  }

  async function assign(caseId: string, volunteerId: string) {
    await pg.query('insert into assignments (case_id, volunteer_id) values ($1, $2)', [
      caseId,
      volunteerId,
    ]);
  }

  function tokenFor(volunteerId: string, role = 'psychologist') {
    return signToken({ sub: volunteerId, role, tokenVersion: 1 }, { ttlSeconds: 300, type: 'access' });
  }

  function authed(path: string, token: string, init: RequestInit = {}) {
    return app.request(path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  }

  it('lists only the cases assigned to the psychologist, with requester contact', async () => {
    const vId = await seedVolunteer();
    const pseudonym = `pseudo-${randomUUID()}`;
    const created = await pg.query<{ id: string }>(
      `insert into cases (pseudonym_id, branch, risk_level, urgency_score, status)
       values ($1, 'verde', 'riesgo_moderado', 10, 'asignado') returning id`,
      [pseudonym],
    );
    const mine = created.rows[0]!.id;
    caseIds.push(mine);
    await pg.query(
      `insert into case_contacts (pseudonym_id, name, contact) values ($1, 'Ana Lista', '+584129999999')`,
      [pseudonym],
    );
    await assign(mine, vId);
    await seedCase(); // someone else's, unassigned to vId

    const res = await authed('/api/v1/cases', await tokenFor(vId));
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<{ caso_id: string; nombre: string | null; contacto: string | null }>;
    expect(list.length).toBe(1);
    const mineRow = list.find((c) => c.caso_id === mine);
    // The assigned psychologist may search by name/phone, so the list carries it.
    expect(mineRow?.nombre).toBe('Ana Lista');
    expect(mineRow?.contacto).toBe('+584129999999');
  });

  it('blocks access to a case not assigned to the psychologist (403)', async () => {
    const vId = await seedVolunteer();
    const otherCase = await seedCase();
    const res = await authed(`/api/v1/cases/${otherCase}`, await tokenFor(vId));
    expect(res.status).toBe(403);
  });

  it('returns the requester identity (name/phone) to the assigned psychologist', async () => {
    const vId = await seedVolunteer();
    const pseudonym = `pseudo-${randomUUID()}`;
    const created = await pg.query<{ id: string }>(
      `insert into cases (pseudonym_id, branch, risk_level, urgency_score, status)
       values ($1, 'verde', 'riesgo_moderado', 10, 'asignado') returning id`,
      [pseudonym],
    );
    const caseId = created.rows[0]!.id;
    caseIds.push(caseId);
    await pg.query(
      `insert into case_contacts (pseudonym_id, name, contact) values ($1, 'Ana Test', '+584120000000')`,
      [pseudonym],
    );
    await assign(caseId, vId);

    const res = await authed(`/api/v1/cases/${caseId}`, await tokenFor(vId));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { contacto: { nombre: string; contacto: string } | null };
    expect(body.contacto?.nombre).toBe('Ana Test');
    expect(body.contacto?.contacto).toBe('+584120000000');
  });

  it('accepts an assigned case once and rejects re-accept (409)', async () => {
    const vId = await seedVolunteer();
    const caseId = await seedCase();
    await assign(caseId, vId);
    const token = await tokenFor(vId);
    expect((await authed(`/api/v1/cases/${caseId}/accept`, token, { method: 'POST' })).status).toBe(200);
    expect((await authed(`/api/v1/cases/${caseId}/accept`, token, { method: 'POST' })).status).toBe(409);
  });

  it('records a structured closure and prevents re-closing (409)', async () => {
    const vId = await seedVolunteer();
    const caseId = await seedCase();
    await assign(caseId, vId);
    const token = await tokenFor(vId);
    await authed(`/api/v1/cases/${caseId}/accept`, token, { method: 'POST' });

    const close1 = await authed(`/api/v1/cases/${caseId}/close`, token, {
      method: 'POST',
      body: JSON.stringify({
        contacto: true,
        sintomas: ['ansiedad_estres_agudo'],
        tecnicas: ['pap'],
        motivo_cierre: 'finalizado',
        derivacion_tipo: 'ninguna',
        horas: 0.5,
      }),
    });
    expect(close1.status).toBe(201);
    const row = await pg.query('select status from cases where id = $1', [caseId]);
    expect(row.rows[0]?.status).toBe('cerrado');
    const closure = await pg.query('select id from case_closures where case_id = $1', [caseId]);
    expect(closure.rowCount).toBe(1);

    const close2 = await authed(`/api/v1/cases/${caseId}/close`, token, {
      method: 'POST',
      body: JSON.stringify({ contacto: false, motivo_no_contacto: 'abandono', horas: 0.05 }),
    });
    expect(close2.status).toBe(409);
  });

  it('cannot close a case that was not accepted (409)', async () => {
    const vId = await seedVolunteer();
    const caseId = await seedCase(); // 'asignado', not accepted
    await assign(caseId, vId);
    const res = await authed(`/api/v1/cases/${caseId}/close`, await tokenFor(vId), {
      method: 'POST',
      body: JSON.stringify({ contacto: false, motivo_no_contacto: 'abandono', horas: 0.05 }),
    });
    expect(res.status).toBe(409);
  });

  it('records a clinical note and blocks an early TEPT diagnosis (RF-4.3)', async () => {
    const vId = await seedVolunteer();
    const caseId = await seedCase();
    await assign(caseId, vId);
    const token = await tokenFor(vId);

    const ok = await authed(`/api/v1/cases/${caseId}/notes`, token, {
      method: 'POST',
      body: JSON.stringify({ contenido: 'Primera sesión', diagnostico: 'estrés agudo' }),
    });
    expect(ok.status).toBe(201);

    const early = await authed(`/api/v1/cases/${caseId}/notes`, token, {
      method: 'POST',
      body: JSON.stringify({ contenido: 'eval', tept_diagnostico: true }),
    });
    expect(early.status).toBe(422);
  });

  it('raises the case to high risk on an acute psychotic crisis (RF-4.2.9)', async () => {
    const vId = await seedVolunteer();
    const caseId = await seedCase('riesgo_moderado');
    await assign(caseId, vId);

    const res = await authed(`/api/v1/cases/${caseId}/notes`, await tokenFor(vId), {
      method: 'POST',
      body: JSON.stringify({ contenido: 'brote', crisis_psicotica_aguda: true }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { derivacion: { type: string; locked: boolean } };
    expect(body.derivacion).toEqual({ type: 'URGENT', locked: true });

    const row = await pg.query('select risk_level from cases where id = $1', [caseId]);
    expect(row.rows[0]?.risk_level).toBe('riesgo_alto');
  });

  it('shows high-risk cases first for the coordinator', async () => {
    const coord = await seedVolunteer();
    await pg.query("update volunteers set role = 'coordinator' where id = $1", [coord]);
    await seedCase('riesgo_alto');

    const res = await authed('/api/v1/cases', await tokenFor(coord, 'coordinator'));
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<{
      nivel_riesgo: string;
      nombre?: unknown;
      contacto?: unknown;
      asignado_a?: unknown;
    }>;
    expect(list[0]?.nivel_riesgo).toBe('riesgo_alto');
    // The coordinator list must stay PII-free (no requester name/phone)…
    expect(list.every((c) => c.nombre === undefined && c.contacto === undefined)).toBe(true);
    // …but it carries the assignee field (operational data) on every row.
    expect(list.every((c) => 'asignado_a' in c)).toBe(true);
  });

  it('shows the assigned psychologist name on the coordinator board', async () => {
    const psy = await seedVolunteer();
    await pg.query("update volunteers set full_name = 'Dra. Pérez' where id = $1", [psy]);
    const coord = await seedVolunteer();
    await pg.query("update volunteers set role = 'coordinator' where id = $1", [coord]);
    const caseId = await seedCase();
    await assign(caseId, psy);

    const res = await authed('/api/v1/cases', await tokenFor(coord, 'coordinator'));
    const list = (await res.json()) as Array<{ caso_id: string; asignado_a: string | null }>;
    expect(list.find((c) => c.caso_id === caseId)?.asignado_a).toBe('Dra. Pérez');
  });

  it('gives the coordinator audited clinical access without PII (issue #25)', async () => {
    const psy = await seedVolunteer();
    const coord = await seedVolunteer();
    await pg.query("update volunteers set role = 'coordinator' where id = $1", [coord]);

    const pseudonym = `pseudo-${randomUUID()}`;
    const created = await pg.query<{ id: string }>(
      `insert into cases (pseudonym_id, branch, risk_level, urgency_score, status)
       values ($1, 'verde', 'riesgo_moderado', 10, 'asignado') returning id`,
      [pseudonym],
    );
    const caseId = created.rows[0]!.id;
    caseIds.push(caseId);
    await pg.query(
      `insert into case_contacts (pseudonym_id, name, contact) values ($1, 'Ana', '+584120000000')`,
      [pseudonym],
    );
    await assign(caseId, psy);
    await authed(`/api/v1/cases/${caseId}/notes`, await tokenFor(psy), {
      method: 'POST',
      body: JSON.stringify({ contenido: 'Primera sesión', diagnostico: 'estrés agudo' }),
    });

    const res = await authed(`/api/v1/cases/${caseId}`, await tokenFor(coord, 'coordinator'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      contacto: unknown | null;
      notas: Array<{ contenido: string }>;
    };
    expect(body.notas.length).toBe(1);
    expect(body.contacto).toBeNull();

    const audit = await pg.query(
      "select id from audit_log where action_type = 'clinical_note_read' and affected_record_id = $1 and user_id = $2",
      [caseId, coord],
    );
    expect(audit.rowCount).toBe(1);
  });

  it('returns capacity counts for the coordinator', async () => {
    const coord = await seedVolunteer();
    await pg.query("update volunteers set role = 'coordinator' where id = $1", [coord]);
    const res = await authed('/api/v1/coordinator/capacity', await tokenFor(coord, 'coordinator'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { riesgo_alto_sin_atender: number };
    expect(typeof body.riesgo_alto_sin_atender).toBe('number');
  });
});
