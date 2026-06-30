import { Hono } from 'hono';
import { queryAuditLog } from '../../../application/audit/query-audit-log';
import {
  createCrisisLine,
  deactivateCrisisLine,
  listCrisisLines,
  updateCrisisLine,
} from '../../../application/crisis-line/manage-crisis-lines';
import {
  inviteCoordinator,
  listInvitations,
  revokeInvitation,
} from '../../../application/coordinator/manage-invitations';
import type { CrisisLineUpdate } from '../../../domain/crisis-line/crisis-line';
import { getAuthUser, requireAuth } from '../middleware/auth';
import { getValidated, validateBody, validateQuery } from '../middleware/validate';
import { getAdminContainer } from './dependencies';
import { presentAuditEntry, presentCrisisLineAdmin, presentInvitation } from './presenters';
import {
  auditQuerySchema,
  coordinatorInviteSchema,
  crisisLineCreateSchema,
  crisisLineUpdateSchema,
  type AuditQuery,
  type CoordinatorInviteBody,
  type CrisisLineCreateBody,
  type CrisisLineUpdateBody,
} from './schemas';

/** Maps the Spanish update body to the domain patch (only present keys). */
function toUpdate(body: CrisisLineUpdateBody): CrisisLineUpdate {
  const patch: CrisisLineUpdate = {};
  if (body.nombre !== undefined) patch.name = body.nombre;
  if (body.telefono !== undefined) patch.phone = body.telefono;
  if (body.cobertura !== undefined) patch.coverage = body.cobertura;
  if (body.hora_inicio !== undefined) patch.startHour = body.hora_inicio;
  if (body.hora_fin !== undefined) patch.endHour = body.hora_fin;
  if (body.prioridad !== undefined) patch.priority = body.prioridad;
  if (body.activa !== undefined) patch.active = body.activa;
  return patch;
}

/** Admin-only endpoints: crisis-line CRUD and audit-log consultation. */
export function createAdminRouter(): Hono {
  const router = new Hono();

  router.use('*', requireAuth({ roles: ['admin'] }));

  // Crisis lines (source of truth for the public routing; soft-delete).
  router.get('/crisis-lines', async (c) => {
    const lines = await listCrisisLines(getAdminContainer().crisisLines);
    return c.json(lines.map(presentCrisisLineAdmin));
  });

  router.post('/crisis-lines', validateBody(crisisLineCreateSchema), async (c) => {
    const admin = getAuthUser(c);
    const body = getValidated<CrisisLineCreateBody>(c, 'body');
    const line = await createCrisisLine(
      {
        name: body.nombre,
        phone: body.telefono,
        coverage: body.cobertura,
        startHour: body.hora_inicio,
        endHour: body.hora_fin,
        priority: body.prioridad,
        active: body.activa,
      },
      admin.sub,
      getAdminContainer().crisisLines,
    );
    return c.json(presentCrisisLineAdmin(line), 201);
  });

  router.patch('/crisis-lines/:id', validateBody(crisisLineUpdateSchema), async (c) => {
    const admin = getAuthUser(c);
    const body = getValidated<CrisisLineUpdateBody>(c, 'body');
    const line = await updateCrisisLine(
      c.req.param('id'),
      toUpdate(body),
      admin.sub,
      getAdminContainer().crisisLines,
    );
    return c.json(presentCrisisLineAdmin(line));
  });

  router.delete('/crisis-lines/:id', async (c) => {
    const admin = getAuthUser(c);
    const line = await deactivateCrisisLine(
      c.req.param('id'),
      admin.sub,
      getAdminContainer().crisisLines,
    );
    return c.json(presentCrisisLineAdmin(line));
  });

  // Coordinator invitations (RF-2.6): issue, list and revoke. The raw token is
  // returned ONCE on creation so the admin can share it if email is unavailable.
  router.post('/coordinators/invitations', validateBody(coordinatorInviteSchema), async (c) => {
    const admin = getAuthUser(c);
    const body = getValidated<CoordinatorInviteBody>(c, 'body');
    const { invitation, token } = await inviteCoordinator(
      { email: body.email, fullName: body.nombre },
      admin.sub,
      getAdminContainer().invitations,
    );
    return c.json({ ...presentInvitation(invitation), token }, 201);
  });

  router.get('/coordinators/invitations', async (c) => {
    const invitations = await listInvitations(getAdminContainer().invitations);
    return c.json(invitations.map(presentInvitation));
  });

  router.delete('/coordinators/invitations/:id', async (c) => {
    const admin = getAuthUser(c);
    const invitation = await revokeInvitation(
      c.req.param('id'),
      admin.sub,
      getAdminContainer().invitations,
    );
    return c.json(presentInvitation(invitation));
  });

  // Audit log consultation (immutable, ADR-0012).
  router.get('/audit', validateQuery(auditQuerySchema), async (c) => {
    const q = getValidated<AuditQuery>(c, 'query');
    const entries = await queryAuditLog(
      {
        actionType: q.accion,
        affectedRecordId: q.registro,
        userId: q.usuario,
        limit: q.limit,
        offset: q.offset,
      },
      getAdminContainer().audit,
    );
    return c.json(entries.map(presentAuditEntry));
  });

  return router;
}
