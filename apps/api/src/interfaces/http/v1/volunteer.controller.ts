import { Hono } from 'hono';
import { getConfig } from '../../../config';
import { registerVolunteer } from '../../../application/volunteer/register-volunteer';
import { approveVolunteer, rejectVolunteer } from '../../../application/volunteer/manage-volunteer';
import type { Volunteer, VolunteerStatus } from '../../../domain/volunteer/volunteer';
import { requireAuth, getAuthUser } from '../middleware/auth';
import { rateLimit } from '../middleware/rate-limit';
import { getValidated, validateBody } from '../middleware/validate';
import { getVolunteerContainer } from './dependencies';
import { registerVolunteerSchema, type RegisterVolunteerBody } from './schemas';

const STATUS_TO_VALIDATION: Record<VolunteerStatus, string> = {
  active: 'validado',
  pending_approval: 'pendiente',
  inactive: 'rechazado',
};

function presentVolunteer(volunteer: Volunteer) {
  return {
    id: volunteer.id,
    nombre: volunteer.fullName,
    cedula_profesional: volunteer.professionalId,
    email: volunteer.email,
    especialidad: volunteer.specialty,
    rol: volunteer.role,
    estado: volunteer.status,
    creado_en: volunteer.createdAt.toISOString(),
  };
}

export function createVolunteerRouter(): Hono {
  const router = new Hono();
  const { security } = getConfig();

  // Registration: public, rate-limited, validated against the FPV registry.
  router.post(
    '/register',
    rateLimit({ limit: security.rate_limit.intake_requests_per_minute, windowMs: 60_000 }),
    validateBody(registerVolunteerSchema),
    async (c) => {
      const body = getValidated<RegisterVolunteerBody>(c, 'body');
      const { registerDeps } = getVolunteerContainer();
      const result = await registerVolunteer(
        {
          fullName: body.nombre,
          professionalId: body.cedula_profesional,
          email: body.email,
          password: body.contrasena,
          specialty: body.especialidad,
          availability: body.disponibilidad,
        },
        registerDeps,
      );
      return c.json(
        {
          voluntario_id: result.volunteerId,
          estado_validacion: STATUS_TO_VALIDATION[result.status],
        },
        202,
      );
    },
  );

  // Admin: list volunteers (defaults to pending approval) and resolve exceptions.
  router.get('/', requireAuth({ roles: ['admin'] }), async (c) => {
    const status = (c.req.query('status') as VolunteerStatus | undefined) ?? 'pending_approval';
    const { volunteers } = getVolunteerContainer();
    const list = await volunteers.listByStatus(status);
    return c.json(list.map(presentVolunteer));
  });

  router.post('/:id/approve', requireAuth({ roles: ['admin'] }), async (c) => {
    const admin = getAuthUser(c);
    await approveVolunteer(c.req.param('id'), admin.sub, getVolunteerContainer().manageDeps);
    return c.json({ ok: true });
  });

  router.post('/:id/reject', requireAuth({ roles: ['admin'] }), async (c) => {
    const admin = getAuthUser(c);
    await rejectVolunteer(c.req.param('id'), admin.sub, getVolunteerContainer().manageDeps);
    return c.json({ ok: true });
  });

  return router;
}
