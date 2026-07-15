import { Hono } from 'hono';
import { getConfig } from '../../../config/index.js';
import { acceptCase } from '../../../application/assignment/accept-case.js';
import { addClinicalNote } from '../../../application/cases/add-note.js';
import {
  coordinatorCloseCase,
  reassignCase,
} from '../../../application/cases/coordinator-actions.js';
import { getCaseForCoordinator } from '../../../application/cases/get-case-for-coordinator.js';
import { getCaseForVolunteer } from '../../../application/cases/get-case.js';
import { listAllCasesDetailed, listAssignedCasesDetailed } from '../../../application/cases/list-cases.js';
import { recordCaseClosure } from '../../../application/cases/record-case-closure.js';
import { activeRoleOf, getAuthUser, requireAuth } from '../middleware/auth.js';
import { getValidated, validateBody } from '../middleware/validate.js';
import { getAssignmentDeps, getCaseDeps } from './dependencies.js';
import {
  presentAssignedCaseSummary,
  presentCaseClosure,
  presentCaseContact,
  presentCaseSummary,
  presentCoordinatorCaseSummary,
  presentNote,
} from './presenters.js';
import {
  addNoteSchema,
  caseClosureSchema,
  coordinatorCloseSchema,
  reassignCaseSchema,
  type AddNoteBody,
  type CaseClosureBody,
  type CoordinatorCloseBody,
  type ReassignCaseBody,
} from './schemas.js';

const STAFF_ROLES = ['psychologist', 'coordinator', 'admin'];
const COORDINATOR_ROLES = ['coordinator', 'admin'];

/** Case actions for authenticated volunteers, psychologists and coordinators. */
export function createCasesRouter(): Hono {
  const router = new Hono();

  // List cases: psychologists see their own (with the requester contact, which
  // they are authorized to see for their cases); coordinators/admins see all,
  // PII-free.
  router.get('/', requireAuth({ roles: STAFF_ROLES }), async (c) => {
    const user = getAuthUser(c);
    const deps = getCaseDeps();
    if (activeRoleOf(c, user) === 'psychologist') {
      const assigned = await listAssignedCasesDetailed(user.sub, deps);
      return c.json(assigned.map(({ case: cs, contact }) => presentAssignedCaseSummary(cs, contact)));
    }
    // Coordinator/admin board: every case enriched with the assigned psychologist.
    const board = await listAllCasesDetailed({
      cases: deps.cases,
      assignments: deps.assignments,
      volunteers: getAssignmentDeps().volunteers,
    });
    return c.json(board.map(({ case: cs, assigneeName }) => presentCoordinatorCaseSummary(cs, assigneeName)));
  });

  // Case detail with notes and closure. The assigned psychologist also sees the
  // requester identity (PII); coordinators/admins get audited clinical access
  // without PII (issue #25, HITL FPV decision).
  router.get('/:id', requireAuth({ roles: STAFF_ROLES }), async (c) => {
    const user = getAuthUser(c);
    const deps = getCaseDeps();
    const acting = activeRoleOf(c, user);
    const detail =
      acting === 'psychologist'
        ? await getCaseForVolunteer(c.req.param('id'), user.sub, deps)
        : await getCaseForCoordinator(c.req.param('id'), { id: user.sub, role: acting }, deps);
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

  // Coordinator manually reassigns a case to a specific active psychologist (RF-2.3).
  router.post(
    '/:id/reassign',
    requireAuth({ roles: COORDINATOR_ROLES }),
    validateBody(reassignCaseSchema),
    async (c) => {
      const actor = getAuthUser(c);
      const body = getValidated<ReassignCaseBody>(c, 'body');
      const caseDeps = getCaseDeps();
      const assignmentDeps = getAssignmentDeps();
      await reassignCase(
        c.req.param('id'),
        body.voluntario_id,
        { id: actor.sub, role: actor.role },
        {
          cases: caseDeps.cases,
          assignments: caseDeps.assignments,
          volunteers: assignmentDeps.volunteers,
          notifier: assignmentDeps.notifier,
          audit: caseDeps.audit,
          config: getConfig(),
          presence: assignmentDeps.presence,
        },
      );
      return c.json({ ok: true });
    },
  );

  // Coordinator administratively closes a stalled case (RF-2.3).
  router.post(
    '/:id/coordinator-close',
    requireAuth({ roles: COORDINATOR_ROLES }),
    validateBody(coordinatorCloseSchema),
    async (c) => {
      const actor = getAuthUser(c);
      const body = getValidated<CoordinatorCloseBody>(c, 'body');
      const caseDeps = getCaseDeps();
      await coordinatorCloseCase(
        c.req.param('id'),
        body.motivo,
        { id: actor.sub, role: actor.role },
        { cases: caseDeps.cases, assignments: caseDeps.assignments, audit: caseDeps.audit },
      );
      return c.json({ ok: true });
    },
  );

  return router;
}
