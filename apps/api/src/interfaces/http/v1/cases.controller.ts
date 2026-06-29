import { Hono } from 'hono';
import { acceptCase } from '../../../application/assignment/accept-case';
import { addClinicalNote } from '../../../application/cases/add-note';
import { getCaseForVolunteer } from '../../../application/cases/get-case';
import { listAllCases, listAssignedCases } from '../../../application/cases/list-cases';
import { updateCaseStatus } from '../../../application/cases/close-case';
import { statusFromDb } from '../../../infrastructure/repositories/enum-maps';
import { getAuthUser, requireAuth } from '../middleware/auth';
import { getValidated, validateBody } from '../middleware/validate';
import { getAssignmentDeps, getCaseDeps } from './dependencies';
import { presentCaseSummary, presentNote } from './presenters';
import { addNoteSchema, updateCaseSchema, type AddNoteBody, type UpdateCaseBody } from './schemas';

const STAFF_ROLES = ['psychologist', 'coordinator', 'admin'];

/** Case actions for authenticated volunteers, psychologists and coordinators. */
export function createCasesRouter(): Hono {
  const router = new Hono();

  // List cases: psychologists see their own; coordinators/admins see all.
  router.get('/', requireAuth({ roles: STAFF_ROLES }), async (c) => {
    const user = getAuthUser(c);
    const deps = getCaseDeps();
    const cases =
      user.role === 'psychologist'
        ? await listAssignedCases(user.sub, deps)
        : await listAllCases(deps);
    return c.json(cases.map(presentCaseSummary));
  });

  // Case detail with notes — assigned psychologist only.
  router.get('/:id', requireAuth({ roles: ['psychologist'] }), async (c) => {
    const user = getAuthUser(c);
    const detail = await getCaseForVolunteer(c.req.param('id'), user.sub, getCaseDeps());
    return c.json({ caso: presentCaseSummary(detail.case), notas: detail.notes.map(presentNote) });
  });

  // Volunteer accepts an assigned case (stops the SLA).
  router.post('/:id/accept', requireAuth({ roles: ['psychologist'] }), async (c) => {
    const user = getAuthUser(c);
    await acceptCase(c.req.param('id'), user.sub, getAssignmentDeps());
    return c.json({ ok: true });
  });

  // Register a clinical note (RF-4.3 / RF-4.2.9 enforced in the use case).
  router.post(
    '/:id/notes',
    requireAuth({ roles: ['psychologist'] }),
    validateBody(addNoteSchema),
    async (c) => {
      const user = getAuthUser(c);
      const body = getValidated<AddNoteBody>(c, 'body');
      const result = await addClinicalNote(
        c.req.param('id'),
        user.sub,
        {
          content: body.contenido,
          diagnosis: body.diagnostico,
          teptDiagnosis: body.tept_diagnostico,
          acutePsychoticCrisis: body.crisis_psicotica_aguda,
        },
        getCaseDeps(),
      );
      return c.json(
        { nota: presentNote(result.note), derivacion: result.referral },
        201,
      );
    },
  );

  // Update case status (e.g. follow-up / close) — assigned psychologist only.
  router.patch(
    '/:id',
    requireAuth({ roles: ['psychologist'] }),
    validateBody(updateCaseSchema),
    async (c) => {
      const user = getAuthUser(c);
      const body = getValidated<UpdateCaseBody>(c, 'body');
      const status = statusFromDb[body.estado];
      if (!status) {
        return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid status' } }, 400);
      }
      await updateCaseStatus(c.req.param('id'), user.sub, status, getCaseDeps());
      return c.json({ ok: true });
    },
  );

  return router;
}
