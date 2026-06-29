import { Hono } from 'hono';
import { getConfig } from '../src/config';
import { buildCors } from '../src/interfaces/http/middleware/cors';
import { buildSecurityHeaders } from '../src/interfaces/http/middleware/security-headers';
import { errorHandler } from '../src/interfaces/http/middleware/error-handler';
import { createIntakeRouter } from '../src/interfaces/http/v1/intake.controller';
import { createCrisisLinesRouter } from '../src/interfaces/http/v1/crisis-lines.controller';
import { createVolunteerRouter } from '../src/interfaces/http/v1/volunteer.controller';
import { createAuthRouter } from '../src/interfaces/http/v1/auth.controller';
import { createCronRouter } from '../src/interfaces/http/v1/cron.controller';
import { createCasesRouter } from '../src/interfaces/http/v1/cases.controller';
import { createCoordinatorRouter } from '../src/interfaces/http/v1/coordinator.controller';
import { createDocsRouter } from '../src/interfaces/http/v1/docs.controller';

/**
 * API entry point. All routes are versioned under `/api/v1` (see CONTRIBUTING.md).
 *
 * Global cross-cutting security (security headers, CORS, central error handling)
 * is wired here so every route inherits it. Per-route middleware (rate limiting,
 * auth, validation) is applied when the real endpoints are added (Block 3+).
 * The Vercel platform adapter is finalized in Block 8 (deployment).
 */
const config = getConfig();
const corsOrigins =
  process.env.NODE_ENV === 'production'
    ? config.security.cors.production_origins
    : config.security.cors.development_origins;

export const app = new Hono().basePath('/api/v1');

// Strict security headers everywhere except the Swagger UI page, which needs a
// relaxed CSP to load its assets (the /docs route sets its own CSP).
const securityHeaders = buildSecurityHeaders();
app.use('*', (c, next) =>
  c.req.path.endsWith('/docs') ? next() : securityHeaders(c, next),
);
app.use('*', buildCors(corsOrigins));
app.onError(errorHandler);

app.get('/health', (c) => {
  return c.json({ status: 'ok', app: config.app.name });
});

app.route('/intake', createIntakeRouter());
app.route('/crisis-lines', createCrisisLinesRouter());
app.route('/auth', createAuthRouter());
app.route('/volunteers', createVolunteerRouter());
app.route('/cases', createCasesRouter());
app.route('/coordinator', createCoordinatorRouter());
app.route('/cron', createCronRouter());
app.route('/', createDocsRouter());

export default app;
