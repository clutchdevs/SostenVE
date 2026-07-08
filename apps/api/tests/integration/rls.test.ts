import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Integration tests for RLS and audit immutability against the local Supabase DB
 * (Docker). Skipped automatically when no database is reachable, so unit-only
 * runs and CI without a DB still pass.
 *
 * RLS is exercised exactly as in production: switch to the `authenticated` role
 * and set the request JWT claims GUC (`sub` + `app_role`), then query.
 */
const DB_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

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

describe.skipIf(!dbAvailable)('RLS and audit immutability (integration)', () => {
  let client: Client;
  const ids = { assigned: '', other: '', caseId: '', pseudonym: `pseudo-${randomUUID()}` };

  beforeAll(async () => {
    client = new Client({ connectionString: DB_URL });
    await client.connect();

    const assigned = await client.query<{ id: string }>(
      `insert into volunteers (full_name, professional_id, role, password_hash, status)
       values ('Assigned', $1, 'psychologist', 'x', 'active') returning id`,
      [`prof-${randomUUID()}`],
    );
    ids.assigned = assigned.rows[0]!.id;

    const other = await client.query<{ id: string }>(
      `insert into volunteers (full_name, professional_id, role, password_hash, status)
       values ('Other', $1, 'psychologist', 'x', 'active') returning id`,
      [`prof-${randomUUID()}`],
    );
    ids.other = other.rows[0]!.id;

    const created = await client.query<{ id: string }>(
      `insert into cases (pseudonym_id, branch, risk_level, urgency_score, status)
       values ($1, 'verde', 'riesgo_moderado', 10, 'asignado') returning id`,
      [ids.pseudonym],
    );
    ids.caseId = created.rows[0]!.id;

    await client.query(
      `insert into case_contacts (pseudonym_id, name, contact) values ($1, 'Ana', '+584120000000')`,
      [ids.pseudonym],
    );
    await client.query(`insert into assignments (case_id, volunteer_id) values ($1, $2)`, [
      ids.caseId,
      ids.assigned,
    ]);
    await client.query(
      `insert into clinical_notes (case_id, author_volunteer_id, content_encrypted)
       values ($1, $2, 'enc')`,
      [ids.caseId, ids.assigned],
    );
  });

  afterAll(async () => {
    if (!client) return;
    await client.query('delete from cases where id = $1', [ids.caseId]);
    await client.query('delete from case_contacts where pseudonym_id = $1', [ids.pseudonym]);
    await client.query('delete from volunteers where id = any($1)', [[ids.assigned, ids.other]]);
    await client.end();
  });

  async function asUser<T>(sub: string, appRole: string, fn: () => Promise<T>): Promise<T> {
    await client.query('begin');
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub, app_role: appRole }),
    ]);
    await client.query('set local role authenticated');
    try {
      return await fn();
    } finally {
      await client.query('rollback');
    }
  }

  it('lets the assigned psychologist read the case', async () => {
    const res = await asUser(ids.assigned, 'psychologist', () =>
      client.query('select id from cases where id = $1', [ids.caseId]),
    );
    expect(res.rowCount).toBe(1);
  });

  it('blocks an unassigned psychologist from reading the case', async () => {
    const res = await asUser(ids.other, 'psychologist', () =>
      client.query('select id from cases where id = $1', [ids.caseId]),
    );
    expect(res.rowCount).toBe(0);
  });

  it('blocks an unassigned psychologist from reading PII', async () => {
    const res = await asUser(ids.other, 'psychologist', () =>
      client.query('select pseudonym_id from case_contacts where pseudonym_id = $1', [
        ids.pseudonym,
      ]),
    );
    expect(res.rowCount).toBe(0);
  });

  it('lets the assigned psychologist read PII', async () => {
    const res = await asUser(ids.assigned, 'psychologist', () =>
      client.query('select pseudonym_id from case_contacts where pseudonym_id = $1', [
        ids.pseudonym,
      ]),
    );
    expect(res.rowCount).toBe(1);
  });

  it('blocks an unassigned psychologist from reading clinical notes', async () => {
    const res = await asUser(ids.other, 'psychologist', () =>
      client.query('select id from clinical_notes where case_id = $1', [ids.caseId]),
    );
    expect(res.rowCount).toBe(0);
  });

  it('lets a coordinator read clinical notes (issue #25, audited access)', async () => {
    const res = await asUser(ids.other, 'coordinator', () =>
      client.query('select id from clinical_notes where case_id = $1', [ids.caseId]),
    );
    expect(res.rowCount).toBe(1);
  });

  it('still blocks a coordinator from reading PII contact', async () => {
    const res = await asUser(ids.other, 'coordinator', () =>
      client.query('select pseudonym_id from case_contacts where pseudonym_id = $1', [
        ids.pseudonym,
      ]),
    );
    expect(res.rowCount).toBe(0);
  });

  it('accepts audit_log inserts but rejects update and delete', async () => {
    const inserted = await client.query<{ id: string }>(
      "insert into audit_log (action_type) values ('read') returning id",
    );
    const auditId = inserted.rows[0]!.id;

    await expect(
      client.query('update audit_log set action_type = $1 where id = $2', ['tampered', auditId]),
    ).rejects.toThrow();
    await expect(client.query('delete from audit_log where id = $1', [auditId])).rejects.toThrow();
  });
});
