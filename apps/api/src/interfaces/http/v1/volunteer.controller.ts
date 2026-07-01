import { Hono } from 'hono';
import { getConfig } from '../../../config';
import { registerVolunteer } from '../../../application/volunteer/register-volunteer';
import { approveVolunteer, rejectVolunteer } from '../../../application/volunteer/manage-volunteer';
import {
  addVolunteerNote,
  listVolunteerNotes,
} from '../../../application/volunteer/manage-volunteer-notes';
import type { Volunteer, VolunteerStatus } from '../../../domain/volunteer/volunteer';
import type { VolunteerNote } from '../../../domain/volunteer/volunteer-note';
import { ApiError } from '../../../shared/errors/api-error';
import { requireAuth, getAuthUser } from '../middleware/auth';
import { rateLimit } from '../middleware/rate-limit';
import { getValidated, validateBody } from '../middleware/validate';
import { getPresenceStore, getVolunteerContainer } from './dependencies';
import {
  presenceSchema,
  registerVolunteerSchema,
  volunteerNoteSchema,
  type PresenceBody,
  type RegisterVolunteerBody,
  type VolunteerNoteBody,
} from './schemas';

const STATUS_TO_VALIDATION: Record<VolunteerStatus, string> = {
  active: 'validado',
  pending_approval: 'pendiente',
  inactive: 'rechazado',
};

function presentVolunteer(volunteer: Volunteer, online = false) {
  return {
    id: volunteer.id,
    nombre: volunteer.fullName,
    cedula_profesional: volunteer.professionalId,
    email: volunteer.email,
    especialidad: volunteer.specialty,
    rol: volunteer.role,
    estado: volunteer.status,
    motivo_excepcion: volunteer.pendingReason ?? null,
    // Real-time presence for the coordinator console (RF-2.5.4).
    en_linea: online,
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

      // Consent integrity (RF-2.1.1): never record acceptance of a version the
      // user did not see. Reject a stale form so the client reloads the text.
      const currentConsentVersion = getConfig().consent.psychologist.version;
      if (body.consentimiento_version !== currentConsentVersion) {
        throw new ApiError(
          409,
          'CONSENT_VERSION_MISMATCH',
          'El consentimiento informado fue actualizado. Recarga el formulario.',
        );
      }

      const { registerDeps } = getVolunteerContainer();
      const result = await registerVolunteer(
        {
          fullName: body.nombre,
          professionalId: body.numero_fpv,
          email: body.email,
          specialty: body.especialidad,
          application: {
            documentType: body.tipo_documento,
            documentNumber: body.numero_documento,
            university: body.universidad,
            graduationYear: body.anio_egreso,
            colegio: body.colegio,
            modalities: body.modalidad,
            availabilitySchedule: body.disponibilidad_horaria,
            papTrained: body.pap,
            papDetail: body.pap_detalle,
          },
          consentVersion: currentConsentVersion,
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

  // Volunteer management is a coordinator responsibility per the PRD (RF-2.3);
  // admins keep access too. List defaults to pending approval (exceptions queue);
  // `status=all` returns the full roster.
  router.get('/', requireAuth({ roles: ['coordinator', 'admin'] }), async (c) => {
    const status = c.req.query('status') ?? 'pending_approval';
    const { volunteers } = getVolunteerContainer();
    const list =
      status === 'all'
        ? await volunteers.listAll()
        : await volunteers.listByStatus(status as VolunteerStatus);
    // Annotate each row with live presence (RF-2.5.4) so the coordinator sees who
    // is actually online right now.
    const online = await getPresenceStore().filterOnline(list.map((v) => v.id));
    return c.json(list.map((v) => presentVolunteer(v, online.has(v.id))));
  });

  // Presence heartbeat / availability toggle (RF-2.5, RF-4.3.1). The PWA calls
  // this on a timer while the volunteer is available; a `false` marks them offline
  // immediately (manual pause), removing them from the assignment pool.
  router.post('/me/presence', requireAuth(), validateBody(presenceSchema), async (c) => {
    const user = getAuthUser(c);
    const body = getValidated<PresenceBody>(c, 'body');
    const presence = getPresenceStore();
    if (body.disponible) {
      await presence.markOnline(user.sub, getConfig().presence.heartbeat_ttl_seconds);
    } else {
      await presence.markOffline(user.sub);
    }
    return c.body(null, 204);
  });

  router.post('/:id/approve', requireAuth({ roles: ['coordinator', 'admin'] }), async (c) => {
    const actor = getAuthUser(c);
    await approveVolunteer(
      c.req.param('id'),
      { id: actor.sub, role: actor.role },
      getVolunteerContainer().manageDeps,
    );
    return c.json({ ok: true });
  });

  router.post('/:id/reject', requireAuth({ roles: ['coordinator', 'admin'] }), async (c) => {
    const actor = getAuthUser(c);
    await rejectVolunteer(
      c.req.param('id'),
      { id: actor.sub, role: actor.role },
      getVolunteerContainer().manageDeps,
    );
    return c.json({ ok: true });
  });

  // Confidential coordinator notes about a volunteer (RF-2.4) — coordinator/admin
  // only; never visible to the volunteer.
  router.get('/:id/notes', requireAuth({ roles: ['coordinator', 'admin'] }), async (c) => {
    const notes = await listVolunteerNotes(c.req.param('id'), getVolunteerContainer().notesDeps);
    return c.json(notes.map(presentVolunteerNote));
  });

  router.post(
    '/:id/notes',
    requireAuth({ roles: ['coordinator', 'admin'] }),
    validateBody(volunteerNoteSchema),
    async (c) => {
      const actor = getAuthUser(c);
      const body = getValidated<VolunteerNoteBody>(c, 'body');
      const note = await addVolunteerNote(
        c.req.param('id'),
        body.contenido,
        { id: actor.sub, role: actor.role },
        getVolunteerContainer().notesDeps,
      );
      return c.json(presentVolunteerNote(note), 201);
    },
  );

  return router;
}

function presentVolunteerNote(note: VolunteerNote) {
  return {
    id: note.id,
    voluntario_id: note.volunteerId,
    autor_id: note.authorId ?? null,
    contenido: note.content,
    creada_en: note.createdAt.toISOString(),
  };
}
