import { Hono } from 'hono';
import { getCapacity } from '../../../application/coordinator/capacity';
import { requireAuth } from '../middleware/auth';
import { getCaseDeps } from './dependencies';

/** Coordinator panel endpoints. */
export function createCoordinatorRouter(): Hono {
  const router = new Hono();

  router.get('/capacity', requireAuth({ roles: ['coordinator', 'admin'] }), async (c) => {
    const snapshot = await getCapacity({ cases: getCaseDeps().cases });
    return c.json({
      casos_sin_asignar: snapshot.casesUnassigned,
      riesgo_alto_sin_atender: snapshot.highRiskUnattended,
      en_cola_por_categoria: snapshot.queuedByCategory,
    });
  });

  return router;
}
