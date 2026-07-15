import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * End-to-end intake tests: real HTTP requests against the app, writing to the
 * local Supabase DB (Docker). Skipped when no DB is reachable.
 */
const DB_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
// Standard Supabase local demo service-role key (not a secret; local only).
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

/** A unique, format-valid Venezuelan mobile (+58 414 + 7 digits) for each case. */
function uniqueVePhone(): string {
  return `+58414${randomUUID().replace(/\D/g, '').slice(0, 7).padEnd(7, '0')}`;
}

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

interface IntakeResponse {
  caso_id: string | null;
  rama: string;
  nivel_riesgo: string;
  lineas_crisis?: { activa: { phone: string } | null; respaldo: Array<{ phone: string }> };
}

describe.skipIf(!dbAvailable)('intake endpoints (e2e)', () => {
  let app: Hono;
  let pg: Client;
  const createdCaseIds: string[] = [];
  const idempotencyKeys: string[] = [];

  beforeAll(async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    process.env.PSEUDONYMIZATION_SALT ??= 'e2e-test-salt';
    app = (await import('../../api/index.js')).app;
    pg = new Client({ connectionString: DB_URL });
    await pg.connect();
  });

  afterAll(async () => {
    if (!pg) return;
    if (createdCaseIds.length) {
      await pg.query('delete from cases where id = any($1)', [createdCaseIds]);
    }
    await pg.query(
      'delete from case_contacts where pseudonym_id not in (select pseudonym_id from cases)',
    );
    if (idempotencyKeys.length) {
      await pg.query('delete from idempotency_keys where key = any($1)', [idempotencyKeys]);
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

  function track(body: IntakeResponse) {
    if (body.caso_id) createdCaseIds.push(body.caso_id);
  }

  it('routes the Likert triage to the correct branch', async () => {
    const red = await post('/api/v1/intake/triage', { respuesta_likert: 1 });
    expect(await red.json()).toEqual({ rama: 'roja' });
    const green = await post('/api/v1/intake/triage', { respuesta_likert: 5 });
    expect(await green.json()).toEqual({ rama: 'verde' });
  });

  it('serves the active crisis line', async () => {
    const res = await app.request('/api/v1/crisis-lines/active');
    expect(res.status).toBe(200);
    const body = (await res.json()) as IntakeResponse['lineas_crisis'];
    expect(body?.activa?.phone || body?.respaldo[0]?.phone).toBeTruthy();
  });

  it('creates a high-risk case and returns crisis lines on the red branch', async () => {
    const res = await post('/api/v1/intake/red-branch', {
      sub_canal: 'recibir-llamada',
      nombre: 'Ana',
      contacto: uniqueVePhone(),
      edad: 30,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as IntakeResponse;
    track(body);
    expect(body.caso_id).toBeTruthy();
    expect(body.nivel_riesgo).toBe('riesgo_alto');
    expect(body.lineas_crisis).toBeDefined();
  });

  it('persists the reported habit changes on the green case (screen 5, RF-1.3)', async () => {
    const res = await post('/api/v1/intake/green-branch', {
      contacto: uniqueVePhone(),
      edad: 30,
      tags: ['material_loss'],
      cambio_habitos: ['sueno', 'alimentacion'],
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as IntakeResponse;
    track(body);
    const row = await pg.query<{ habit_changes: string[] }>(
      'select habit_changes from cases where id = $1',
      [body.caso_id],
    );
    expect(row.rows[0]?.habit_changes).toEqual(['sueno', 'alimentacion']);
  });

  it('classifies a green submission with only yellow tags as follow-up', async () => {
    const res = await post('/api/v1/intake/green-branch', {
      contacto: uniqueVePhone(),
      edad: 30,
      tipo_solicitante: 'familiar',
      tags: ['material_loss'],
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as IntakeResponse;
    track(body);
    expect(body.nivel_riesgo).toBe('seguimiento');
    expect(body.lineas_crisis).toBeUndefined();
  });

  it('escalates a green submission with a red tag to high risk with crisis lines', async () => {
    const res = await post('/api/v1/intake/green-branch', {
      contacto: uniqueVePhone(),
      edad: 30,
      tags: ['suicidal_ideation'],
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as IntakeResponse;
    track(body);
    expect(body.nivel_riesgo).toBe('riesgo_alto');
    expect(body.lineas_crisis).toBeDefined();
  });

  it('is idempotent on the red branch for the same key (no duplicate case)', async () => {
    const key = `idem-${randomUUID()}`;
    idempotencyKeys.push(key);
    const payload = {
      sub_canal: 'recibir-llamada',
      nombre: 'Luis',
      contacto: uniqueVePhone(),
      edad: 40,
    };
    const first = (await (await post('/api/v1/intake/red-branch', payload, {
      'Idempotency-Key': key,
    })).json()) as IntakeResponse;
    const second = (await (await post('/api/v1/intake/red-branch', payload, {
      'Idempotency-Key': key,
    })).json()) as IntakeResponse;
    track(first);
    expect(second.caso_id).toBe(first.caso_id);
  });

  // Regression: the same phone re-submitted (no Idempotency-Key, as the web client
  // sends) used to hit the global-unique pseudonym → 500 → the offline outbox
  // retried forever. It must now reuse the open case, and open a new one only once
  // the previous is closed.
  it('reuses the open case for a repeated contact and opens a new one after closure', async () => {
    const contacto = uniqueVePhone();

    const first = await post('/api/v1/intake/red-branch', { sub_canal: 'recibir-llamada', contacto, edad: 30 });
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as IntakeResponse;
    track(firstBody);

    // Re-submit while the case is open → same case, no duplicate-key 500.
    const again = await post('/api/v1/intake/red-branch', { sub_canal: 'recibir-llamada', contacto, edad: 30 });
    expect(again.status).toBe(201);
    expect(((await again.json()) as IntakeResponse).caso_id).toBe(firstBody.caso_id);

    // Close it, then a new submission from the same person creates a NEW case.
    await pg.query("update cases set status = 'cerrado' where id = $1", [firstBody.caso_id]);
    const afterClose = await post('/api/v1/intake/red-branch', { sub_canal: 'recibir-llamada', contacto, edad: 30 });
    expect(afterClose.status).toBe(201);
    const afterCloseBody = (await afterClose.json()) as IntakeResponse;
    track(afterCloseBody);
    expect(afterCloseBody.caso_id).not.toBe(firstBody.caso_id);
  });
});
