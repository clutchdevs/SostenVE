import { Hono } from 'hono';
import { getConfig } from '../../../config/index.js';
import { acceptInvitation } from '../../../application/coordinator/accept-invitation.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { getValidated, validateBody } from '../middleware/validate.js';
import { getAcceptInvitationDeps } from './dependencies.js';
import { acceptInvitationSchema, type AcceptInvitationBody } from './schemas.js';

/**
 * Public coordinator onboarding (RF-2.6): redeem an invitation token to activate
 * the account. Rate-limited like other unauthenticated write endpoints to slow
 * token brute-forcing (each token already has ~256 bits of entropy).
 */
export function createCoordinatorOnboardingRouter(): Hono {
  const router = new Hono();
  const { security } = getConfig();

  router.post(
    '/accept-invitation',
    rateLimit({ limit: security.rate_limit.intake_requests_per_minute, windowMs: 60_000 }),
    validateBody(acceptInvitationSchema),
    async (c) => {
      const body = getValidated<AcceptInvitationBody>(c, 'body');
      const result = await acceptInvitation(
        {
          token: body.token,
          password: body.contrasena,
          firstName: body.nombres,
          lastName: body.apellidos,
          documentType: body.tipo_documento,
          documentNumber: body.numero_documento,
          fpv: body.numero_fpv,
          phone: body.telefono,
        },
        getAcceptInvitationDeps(),
      );
      return c.json({ voluntario_id: result.volunteerId }, 201);
    },
  );

  return router;
}
