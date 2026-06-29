import { Hono } from 'hono';
import { acceptCase } from '../../../application/assignment/accept-case';
import { getAuthUser, requireAuth } from '../middleware/auth';
import { getAssignmentDeps } from './dependencies';

/** Case actions performed by authenticated volunteers. */
export function createCasesRouter(): Hono {
  const router = new Hono();

  router.post('/:id/accept', requireAuth({ roles: ['psychologist'] }), async (c) => {
    const user = getAuthUser(c);
    await acceptCase(c.req.param('id'), user.sub, getAssignmentDeps());
    return c.json({ ok: true });
  });

  return router;
}
