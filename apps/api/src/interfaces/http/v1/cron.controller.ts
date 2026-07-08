import { Hono } from 'hono';
import type { Context } from 'hono';
import { processQueue } from '../../../application/assignment/process-queue.js';
import { cronAuth } from '../middleware/cron-auth.js';
import { getAssignmentDeps } from './dependencies.js';

/**
 * Internal cron endpoint (invoked by Vercel Cron, not users). Protected by a
 * shared secret. Runs the assignment + SLA-escalation pass. Accepts GET (Vercel
 * Cron uses GET) and POST.
 */
export function createCronRouter(): Hono {
  const router = new Hono();
  router.use('/check-sla', cronAuth());

  const handler = async (c: Context) => {
    const result = await processQueue(getAssignmentDeps());
    return c.json(result);
  };

  router.get('/check-sla', handler);
  router.post('/check-sla', handler);

  return router;
}
