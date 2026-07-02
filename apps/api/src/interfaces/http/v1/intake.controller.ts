import { Hono } from 'hono';
import { getConfig } from '../../../config';
import { classifyInitialBranch } from '../../../application/intake/triage-initial';
import { submitRedBranch } from '../../../application/intake/submit-red-branch';
import { submitGreenBranch } from '../../../application/intake/submit-green-branch';
import { withIdempotency } from '../../../application/intake/idempotency';
import type { IntakeCaseResult } from '../../../application/intake/types';
import { branchToDb, modalityFromDb, requesterFromDb } from '../../../infrastructure/repositories/enum-maps';
import { rateLimit } from '../middleware/rate-limit';
import { getValidated, validateBody } from '../middleware/validate';
import { getIntakeContainer } from './dependencies';
import { presentIntakeResult } from './presenters';
import {
  greenBranchSchema,
  redBranchSchema,
  triageInitialSchema,
  type GreenBranchBody,
  type RedBranchBody,
  type TriageInitialBody,
} from './schemas';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** Intake routes (Likert triage + red/green branch). Rate-limited per IP. */
export function createIntakeRouter(): Hono {
  const router = new Hono();
  const { security } = getConfig();

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
      IDEMPOTENCY_TTL_MS,
      () =>
        submitRedBranch(
          {
            subChannel: body.sub_canal,
            name: body.nombre,
            contact: body.contacto,
            age: body.edad,
          },
          intakeDeps,
        ),
    );

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
        age: body.edad,
        tagCodes: body.tags,
        habitChanges: body.cambio_habitos,
      },
      intakeDeps,
    );

    return c.json(presentIntakeResult(result), 201);
  });

  return router;
}

/** Joins "Ciudad, Estado" for the case zone, tolerating either part missing. */
function composeZone(ciudad?: string, estado?: string): string | undefined {
  const parts = [ciudad?.trim(), estado?.trim()].filter((p): p is string => !!p);
  return parts.length > 0 ? parts.join(', ') : undefined;
}
