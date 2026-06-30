import { Hono } from 'hono';
import { getConfig } from '../../../config';
import { acceptInvitation } from '../../../application/coordinator/accept-invitation';
import { rateLimit } from '../middleware/rate-limit';
import { getValidated, validateBody } from '../middleware/validate';
import { getAcceptInvitationDeps } from './dependencies';
import { acceptInvitationSchema, type AcceptInvitationBody } from './schemas';

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
        { token: body.token, password: body.contrasena },
        getAcceptInvitationDeps(),
      );
      return c.json({ voluntario_id: result.volunteerId }, 201);
    },
  );

  return router;
}
