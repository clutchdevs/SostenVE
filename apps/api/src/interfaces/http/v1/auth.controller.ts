import { Hono } from 'hono';
import { getConfig } from '../../../config/index.js';
import { loginVolunteer } from '../../../application/volunteer/login-volunteer.js';
import { changePassword } from '../../../application/volunteer/change-password.js';
import { requestPasswordReset, resetPassword } from '../../../application/volunteer/reset-password.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { getAuthUser, requireAuth } from '../middleware/auth.js';
import { getValidated, validateBody } from '../middleware/validate.js';
import { getPasswordFlowContainer, getVolunteerContainer } from './dependencies.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  type ChangePasswordBody,
  type ForgotPasswordBody,
  type LoginBody,
  type ResetPasswordBody,
} from './schemas.js';

/**
 * Auth endpoints. Login and the public password-recovery endpoints are
 * rate-limited to mitigate credential stuffing and reset-token brute-forcing.
 */
export function createAuthRouter(): Hono {
  const router = new Hono();
  const { security } = getConfig();

  router.use(
    '/login',
    rateLimit({
      limit: security.rate_limit.login_attempts_before_lockout,
      windowMs: security.rate_limit.login_lockout_minutes * 60_000,
    }),
  );

  router.post('/login', validateBody(loginSchema), async (c) => {
    const body = getValidated<LoginBody>(c, 'body');
    const { loginDeps } = getVolunteerContainer();
    const result = await loginVolunteer({ email: body.email, password: body.contrasena }, loginDeps);
    return c.json({
      token: result.accessToken,
      refresh_token: result.refreshToken,
      rol: result.role,
      roles: result.roles,
    });
  });

  // Authenticated self-service change (RF-2.2.4). Any signed-in staff member can
  // rotate their own password; the current one is re-verified in the use case.
  router.post(
    '/change-password',
    requireAuth(),
    validateBody(changePasswordSchema),
    async (c) => {
      const body = getValidated<ChangePasswordBody>(c, 'body');
      await changePassword(
        {
          volunteerId: getAuthUser(c).sub,
          currentPassword: body.contrasena_actual,
          newPassword: body.contrasena_nueva,
        },
        getPasswordFlowContainer().change,
      );
      // token_version was bumped, so the caller's current token is now stale.
      return c.body(null, 204);
    },
  );

  // Public recovery endpoints share the anonymous write rate limit to slow
  // enumeration/brute-force. Both always answer uniformly (no account signal).
  const recoveryLimit = rateLimit({
    limit: security.rate_limit.intake_requests_per_minute,
    windowMs: 60_000,
  });

  router.post('/forgot-password', recoveryLimit, validateBody(forgotPasswordSchema), async (c) => {
    const body = getValidated<ForgotPasswordBody>(c, 'body');
    await requestPasswordReset({ email: body.email }, getPasswordFlowContainer().requestReset);
    // Uniform response whether or not the email maps to an account.
    return c.body(null, 202);
  });

  router.post('/reset-password', recoveryLimit, validateBody(resetPasswordSchema), async (c) => {
    const body = getValidated<ResetPasswordBody>(c, 'body');
    await resetPassword(
      { token: body.token, newPassword: body.contrasena },
      getPasswordFlowContainer().reset,
    );
    return c.body(null, 204);
  });

  return router;
}
