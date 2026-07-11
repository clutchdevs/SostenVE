import { Hono } from 'hono';
import { getConfig } from '../../../config/index.js';
import {
  acceptInvitation,
  getInvitationInfo,
} from '../../../application/coordinator/accept-invitation.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { getValidated, validateBody } from '../middleware/validate.js';
import { getAcceptInvitationDeps } from './dependencies.js';
import {
  acceptInvitationSchema,
  invitationInfoSchema,
  type AcceptInvitationBody,
  type InvitationInfoBody,
} from './schemas.js';

/**
 * Public coordinator onboarding (RF-2.6): redeem an invitation token to activate
 * the account. Rate-limited like other unauthenticated write endpoints to slow
 * token brute-forcing (each token already has ~256 bits of entropy).
 */
export function createCoordinatorOnboardingRouter(): Hono {
  const router = new Hono();
  const { security } = getConfig();

  const onboardingLimit = rateLimit({
    limit: security.rate_limit.intake_requests_per_minute,
    windowMs: 60_000,
  });

  // Preview the invitation so the UI can adapt: an existing account only confirms
  // (the coordinator role is added), a new one fills the full sign-up form.
  router.post('/invitation-info', onboardingLimit, validateBody(invitationInfoSchema), async (c) => {
    const body = getValidated<InvitationInfoBody>(c, 'body');
    const info = await getInvitationInfo(body.token, getAcceptInvitationDeps());
    return c.json({
      email: info.email,
      nombre: info.fullName,
      cuenta_existente: info.existingAccount,
    });
  });

  router.post('/accept-invitation', onboardingLimit, validateBody(acceptInvitationSchema), async (c) => {
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
    return c.json({ voluntario_id: result.volunteerId, rol_agregado: result.roleAdded }, 201);
  });

  return router;
}
