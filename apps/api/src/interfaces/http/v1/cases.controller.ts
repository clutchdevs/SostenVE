import { Hono } from 'hono';
import { acceptCase } from '../../../application/assignment/accept-case';
import { addClinicalNote } from '../../../application/cases/add-note';
import { getCaseForCoordinator } from '../../../application/cases/get-case-for-coordinator';
import { getCaseForVolunteer } from '../../../application/cases/get-case';
import { listAllCases, listAssignedCases } from '../../../application/cases/list-cases';
import { recordCaseClosure } from '../../../application/cases/record-case-closure';
import { getAuthUser, requireAuth } from '../middleware/auth';
import { getValidated, validateBody } from '../middleware/validate';
import { getAssignmentDeps, getCaseDeps } from './dependencies';
import { presentCaseClosure, presentCaseContact, presentCaseSummary, presentNote } from './presenters';
import { addNoteSchema, caseClosureSchema, type AddNoteBody, type CaseClosureBody } from './schemas';

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

  // Case detail with notes and closure. The assigned psychologist also sees the
  // requester identity (PII); coordinators/admins get audited clinical access
  // without PII (issue #25, HITL FPV decision).
  router.get('/:id', requireAuth({ roles: STAFF_ROLES }), async (c) => {
    const user = getAuthUser(c);
    const deps = getCaseDeps();
    const detail =
      user.role === 'psychologist'
        ? await getCaseForVolunteer(c.req.param('id'), user.sub, deps)
        : await getCaseForCoordinator(c.req.param('id'), { id: user.sub, role: user.role }, deps);
    return c.json({
      caso: presentCaseSummary(detail.case),
      contacto: presentCaseContact(detail.contact),
      notas: detail.notes.map(presentNote),
      cierre: presentCaseClosure(detail.closure),
    });
  });

  // Volunteer accepts an assigned case (only from the `asignado` state).
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
      return c.json({ nota: presentNote(result.note), derivacion: result.referral }, 201);
    },
  );

  // Structured clinical closure (Module 4) — only from `aceptado`, terminal.
  router.post(
    '/:id/close',
    requireAuth({ roles: ['psychologist'] }),
    validateBody(caseClosureSchema),
    async (c) => {
      const user = getAuthUser(c);
      const body = getValidated<CaseClosureBody>(c, 'body');
      const closure = await recordCaseClosure(
        c.req.param('id'),
        user.sub,
        {
          contacted: body.contacto,
          noContactReason: body.motivo_no_contacto,
          sex: body.sexo,
          symptoms: body.sintomas,
          otherSymptom: body.otro_sintoma,
          contactMedium: body.medio_contacto,
          techniques: body.tecnicas,
          closeReason: body.motivo_cierre,
          referralType: body.derivacion_tipo,
          referralDestination: body.derivacion_destino,
          hours: body.horas,
          comment: body.comentario,
        },
        getCaseDeps(),
      );
      return c.json({ cierre: presentCaseClosure(closure) }, 201);
    },
  );

  return router;
}
