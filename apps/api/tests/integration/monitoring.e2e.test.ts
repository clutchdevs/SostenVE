import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * E2E for the observability endpoint (issue #8): GET /metrics is coordinator/
 * admin only and returns the SLA/queue/uptime snapshot. Skipped when no DB.
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

describe.skipIf(!dbAvailable)('monitoring metrics (e2e)', () => {
  let app: Hono;
  let signToken: typeof import('../../src/shared/security/jwt').signToken;

  beforeAll(async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    process.env.PSEUDONYMIZATION_SALT ??= 'e2e-test-salt';
    process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 9).toString('base64');
    process.env.JWT_SECRET ??= 'test-secret-value-at-least-32-bytes-long!!';
    app = (await import('../../api/index')).app;
    signToken = (await import('../../src/shared/security/jwt')).signToken;
  });
  afterAll(async () => {});

  function token(role: string) {
    return signToken({ sub: randomUUID(), role, tokenVersion: 1 }, { ttlSeconds: 300, type: 'access' });
  }

  it('returns the metrics snapshot to a coordinator', async () => {
    const res = await app.request('/api/v1/metrics', {
      headers: { Authorization: `Bearer ${await token('coordinator')}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      generated_at: string;
      uptime_seconds: number;
      tiempo_asignacion: Record<string, unknown>;
      cola: { pendientes: number; sla_vencidos: number };
      totales: { casos: number };
    };
    expect(body.generated_at).toBeTruthy();
    expect(typeof body.uptime_seconds).toBe('number');
    expect(body.tiempo_asignacion).toHaveProperty('riesgo_alto');
    expect(typeof body.cola.sla_vencidos).toBe('number');
    expect(typeof body.totales.casos).toBe('number');
  });

  it('blocks a psychologist (403) and the health probe stays public', async () => {
    const denied = await app.request('/api/v1/metrics', {
      headers: { Authorization: `Bearer ${await token('psychologist')}` },
    });
    expect(denied.status).toBe(403);

    const health = await app.request('/api/v1/health');
    expect(health.status).toBe(200);
    expect(typeof ((await health.json()) as { uptime_seconds: number }).uptime_seconds).toBe('number');
  });
});
