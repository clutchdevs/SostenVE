import { Hono } from 'hono';
import { getConfig } from '../../../config';
import { loginVolunteer } from '../../../application/volunteer/login-volunteer';
import { rateLimit } from '../middleware/rate-limit';
import { getValidated, validateBody } from '../middleware/validate';
import { getVolunteerContainer } from './dependencies';
import { loginSchema, type LoginBody } from './schemas';

/** Auth endpoints. Login is rate-limited to mitigate credential stuffing. */
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
    });
  });

  return router;
}
