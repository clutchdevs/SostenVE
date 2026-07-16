import { Hono } from 'hono';
import { getConfig } from '../../../config/index.js';
import { classifyInitialBranch } from '../../../application/intake/triage-initial.js';
import { submitRedBranch } from '../../../application/intake/submit-red-branch.js';
import { submitGreenBranch } from '../../../application/intake/submit-green-branch.js';
import { withIdempotency } from '../../../application/intake/idempotency.js';
import { assignPendingCases } from '../../../application/assignment/assign-cases.js';
import { logger } from '../../../shared/logger.js';
import type { IntakeCaseResult } from '../../../application/intake/types.js';
import {
  branchToDb,
  contactMethodFromDb,
  modalityFromDb,
  requesterFromDb,
} from '../../../infrastructure/repositories/enum-maps.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { getValidated, validateBody } from '../middleware/validate.js';
import { getAssignmentDeps, getIntakeContainer } from './dependencies.js';
import { presentIntakeResult } from './presenters.js';
import {
  greenBranchSchema,
  redBranchSchema,
  triageInitialSchema,
  type GreenBranchBody,
  type RedBranchBody,
  type TriageInitialBody,
} from './schemas.js';

/** Intake routes (Likert triage + red/green branch). Rate-limited per IP. */
export function createIntakeRouter(): Hono {
  const router = new Hono();
  const { security, intake } = getConfig();
  const idempotencyTtlMs = intake.idempotency_ttl_hours * 60 * 60 * 1000;

  router.use(
    '*',
    rateLimit({
      limit: security.rate_limit.intake_requests_per_minute,
      windowMs: 60_000,
    }),
  );

  router.post('/triage', validateBody(triageInitialSchema), (c) => {
    const body = getValidated<TriageInitialBody>(c, 'body');
    const branch = classifyInitialBranch(
      body.respuesta_likert,
      getConfig().triage.likert_critical_option,
    );
    return c.json({ rama: branchToDb[branch] });
  });

  router.post('/red-branch', validateBody(redBranchSchema), async (c) => {
    const body = getValidated<RedBranchBody>(c, 'body');
    const { intakeDeps, idempotency } = getIntakeContainer();
    const idempotencyKey = c.req.header('Idempotency-Key');

    const result = await withIdempotency<IntakeCaseResult>(
      idempotency,
      idempotencyKey,
      idempotencyTtlMs,
      () =>
        submitRedBranch(
          {
            subChannel: body.sub_canal,
            name: body.nombre,
            contact: body.contacto,
            age: body.edad,
            likert: body.respuesta_likert,
          },
          intakeDeps,
        ),
    );

    await tryAssignImmediately(result);
    return c.json(presentIntakeResult(result), 201);
  });

  router.post('/green-branch', validateBody(greenBranchSchema), async (c) => {
    const body = getValidated<GreenBranchBody>(c, 'body');
    const { intakeDeps } = getIntakeContainer();

    // Location screen sends estado + ciudad; compose into the case zone (falling
    // back to the free-form `zona` for compatibility).
    const zone = composeZone(body.ciudad, body.estado) ?? body.zona;

    const result = await submitGreenBranch(
      {
        name: body.nombre,
        contact: body.contacto,
        requesterType: body.tipo_solicitante
          ? requesterFromDb[body.tipo_solicitante]
          : undefined,
        zone,
        region: body.estado,
        modality: body.modalidad ? modalityFromDb[body.modalidad] : undefined,
        contactMethod: body.metodo_contacto ? contactMethodFromDb[body.metodo_contacto] : undefined,
        age: body.edad,
        tagCodes: body.tags,
        habitChanges: body.cambio_habitos,
        likert: body.respuesta_likert,
      },
      intakeDeps,
    );

    await tryAssignImmediately(result);
    return c.json(presentIntakeResult(result), 201);
  });

  return router;
}

/**
 * Event-driven assignment (RF-2.5): as soon as a case is created, try to place it
 * with an online psychologist instead of waiting for the next cron sweep. It is
 * best-effort — the requester already has their response (and crisis lines), so a
 * failure here must never fail intake; the cron remains the safety net. Skipped
 * for the 'llamar' red sub-channel, which creates no case (`caseId` is null).
 */
async function tryAssignImmediately(result: IntakeCaseResult): Promise<void> {
  if (!result.caseId) return;
  try {
    await assignPendingCases(getAssignmentDeps());
  } catch (error) {
    logger.warn('event-driven assignment after intake failed (cron will retry)', {
      caseId: result.caseId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Joins "Ciudad, Estado" for the case zone, tolerating either part missing. */
function composeZone(ciudad?: string, estado?: string): string | undefined {
  const parts = [ciudad?.trim(), estado?.trim()].filter((p): p is string => !!p);
  return parts.length > 0 ? parts.join(', ') : undefined;
}
