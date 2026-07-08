import { Hono } from 'hono';
import { collectMetrics } from '../../../application/monitoring/collect-metrics';
import { requireAuth } from '../middleware/auth';
import { getCaseDeps } from './dependencies';

/**
 * Observability endpoint (fase 06): SLA/queue metrics + uptime for the
 * coordinator/admin. Read-only; the public liveness probe stays at `/health`.
 */
export function createMonitoringRouter(): Hono {
  const router = new Hono();

  router.get('/', requireAuth({ roles: ['coordinator', 'admin'] }), async (c) => {
    const deps = getCaseDeps();
    const metrics = await collectMetrics({ cases: deps.cases, assignments: deps.assignments });
    return c.json(metrics);
  });

  return router;
}
