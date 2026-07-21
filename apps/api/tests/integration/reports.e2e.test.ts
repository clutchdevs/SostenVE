import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * E2E for the closed-case report (issue #169, ADR-0017).
 *
 * Guards the three rules that carry the risk decision: only coordinator/admin get in,
 * the requester's identity never leaves, and every read is written to the audit log —
 * the traceability that makes the bulk download acceptable. Skipped when no DB.
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

describe.skipIf(!dbAvailable)('closed-case report (e2e)', () => {
  let app: Hono;
  let signToken: typeof import('../../src/shared/security/jwt.js').signToken;
  let pg: Client;
  const volunteerIds: string[] = [];
  const caseIds: string[] = [];
  const REQUESTER_NAME = 'Solicitante Confidencial';
  const REQUESTER_PHONE = '+584141234567';

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

  // Session validation (RF-2.7) resolves the token version from the account, so tokens
  // must belong to a real volunteer row.
  async function seedVolunteer(role: string): Promise<string> {
    const res = await pg.query<{ id: string }>(
      `insert into volunteers (full_name, professional_id, role, password_hash, status)
       values ('Staff Reporte', $1, $2, 'x', 'active') returning id`,
      [`FPV-${randomUUID().slice(0, 8)}`, role],
    );
    const id = res.rows[0]!.id;
    volunteerIds.push(id);
    return id;
  }

  function tokenFor(id: string, role: string) {
    return signToken({ sub: id, role, tokenVersion: 1 }, { ttlSeconds: 300, type: 'access' });
  }

  /** A closed case with its requester PII stored, so we can prove the PII never surfaces. */
  async function seedClosedCase(authorId: string): Promise<string> {
    const pseudonym = `pseudo-${randomUUID()}`;
    const caseRes = await pg.query<{ id: string }>(
      `insert into cases (pseudonym_id, branch, risk_level, urgency_score, status, zone, age)
       values ($1, 'verde', 'riesgo_moderado', 10, 'cerrado', 'San Felipe, Yaracuy', 34) returning id`,
      [pseudonym],
    );
    const id = caseRes.rows[0]!.id;
    caseIds.push(id);
    await pg.query(
      `insert into case_contacts (pseudonym_id, name, contact) values ($1, $2, $3)
       on conflict (pseudonym_id) do nothing`,
      [pseudonym, REQUESTER_NAME, REQUESTER_PHONE],
    );
    await pg.query(
      `insert into case_closures (case_id, author_volunteer_id, contacted, sex, symptoms,
                                  techniques, close_reason, referral_type, referral_destinations, minutes)
       values ($1, $2, true, 'femenino', '{ansiedad}', '{escucha_activa}', 'objetivos_cumplidos',
               'seguimiento', '{psicologia}', 45)`,
      [id, authorId],
    );
    return id;
  }

  it('returns closed cases to a coordinator without any requester identity', async () => {
    const author = await seedVolunteer('psychologist');
    const caseId = await seedClosedCase(author);
    const coordinatorId = await seedVolunteer('coordinator');

    const res = await app.request('/api/v1/reports/closed-cases?limit=200', {
      headers: { Authorization: `Bearer ${await tokenFor(coordinatorId, 'coordinator')}` },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { total: number; items: Record<string, unknown>[] };
    const row = body.items.find((r) => r.caso_id === caseId || r.casoId === caseId);
    expect(row).toBeTruthy();
    // The closure is reproduced as stored (ADR-0017).
    expect(row).toMatchObject({ minutos: 45, sexo: 'femenino', motivoCierre: 'objetivos_cumplidos' });

    // The requester's identity must not appear anywhere in the payload.
    const raw = JSON.stringify(body);
    expect(raw).not.toContain(REQUESTER_NAME);
    expect(raw).not.toContain(REQUESTER_PHONE);
  });

  it('downloads a formatted Excel workbook', async () => {
    const author = await seedVolunteer('psychologist');
    await seedClosedCase(author);
    const coordinatorId = await seedVolunteer('coordinator');

    const res = await app.request('/api/v1/reports/closed-cases.xlsx', {
      headers: { Authorization: `Bearer ${await tokenFor(coordinatorId, 'coordinator')}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('spreadsheetml.sheet');
    expect(res.headers.get('content-disposition')).toContain('.xlsx');

    const bytes = new Uint8Array(await res.arrayBuffer());
    // xlsx is a zip: "PK". Guards against silently shipping something Excel cannot open.
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]);
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('downloads a CSV with the same data and an attachment header', async () => {
    const author = await seedVolunteer('psychologist');
    await seedClosedCase(author);
    const coordinatorId = await seedVolunteer('coordinator');

    const res = await app.request('/api/v1/reports/closed-cases.csv', {
      headers: { Authorization: `Bearer ${await tokenFor(coordinatorId, 'coordinator')}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('attachment');

    // Check the BOM on the raw bytes: `Response.text()` decodes UTF-8 and strips a
    // leading BOM, so asserting on the string would always fail even when it is sent.
    const bytes = new Uint8Array(await res.clone().arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);

    const csv = await res.text();
    expect(csv).toContain('"minutos"');
    expect(csv).not.toContain(REQUESTER_NAME);
    expect(csv).not.toContain(REQUESTER_PHONE);
  });

  it('records every view and download in the audit log', async () => {
    const coordinatorId = await seedVolunteer('coordinator');
    const token = await tokenFor(coordinatorId, 'coordinator');

    await app.request('/api/v1/reports/closed-cases', { headers: { Authorization: `Bearer ${token}` } });
    await app.request('/api/v1/reports/closed-cases.csv', { headers: { Authorization: `Bearer ${token}` } });

    const audited = await pg.query<{ action_type: string }>(
      `select action_type from audit_log where user_id = $1 order by created_at`,
      [coordinatorId],
    );
    const actions = audited.rows.map((r) => r.action_type);
    expect(actions.some((a) => a.startsWith('closed_case_report_view'))).toBe(true);
    expect(actions.some((a) => a.startsWith('closed_case_report_download'))).toBe(true);
  });

  it('blocks a psychologist (403) and an anonymous caller (401)', async () => {
    const psychologistId = await seedVolunteer('psychologist');
    const denied = await app.request('/api/v1/reports/closed-cases', {
      headers: { Authorization: `Bearer ${await tokenFor(psychologistId, 'psychologist')}` },
    });
    expect(denied.status).toBe(403);

    const anonymous = await app.request('/api/v1/reports/closed-cases');
    expect(anonymous.status).toBe(401);
  });

  it('degrades an undecryptable field instead of failing the whole report', async () => {
    // Simulates a row encrypted under a different key (a rotation, a partial migration).
    // A bulk read must not become a 500 because of one bad value.
    const author = await seedVolunteer('psychologist');
    const caseId = await seedClosedCase(author);
    await pg.query('update case_closures set comment_encrypted = $1 where case_id = $2', [
      'no-es-un-payload-cifrado-valido',
      caseId,
    ]);
    const coordinatorId = await seedVolunteer('coordinator');

    const res = await app.request('/api/v1/reports/closed-cases?limit=200', {
      headers: { Authorization: `Bearer ${await tokenFor(coordinatorId, 'coordinator')}` },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { items: { casoId: string; comentario: string | null; minutos: number }[] };
    const row = body.items.find((r) => r.casoId === caseId);
    // The row still comes back, with the rest of its data intact.
    expect(row?.minutos).toBe(45);
    expect(row?.comentario).toContain('no se pudo descifrar');
  });

  it('rejects an invalid filter', async () => {
    const coordinatorId = await seedVolunteer('coordinator');
    const res = await app.request('/api/v1/reports/closed-cases?nivel_riesgo=inventado', {
      headers: { Authorization: `Bearer ${await tokenFor(coordinatorId, 'coordinator')}` },
    });
    expect(res.status).toBe(400);
  });
});
