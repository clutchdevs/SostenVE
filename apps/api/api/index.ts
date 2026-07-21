import type { IncomingMessage, ServerResponse } from 'node:http';
import { Hono } from 'hono';
import { handle } from '@hono/node-server/vercel';
import { getConfig } from '../src/config/index.js';
import { buildCors } from '../src/interfaces/http/middleware/cors.js';
import { buildSecurityHeaders } from '../src/interfaces/http/middleware/security-headers.js';
import { errorHandler } from '../src/interfaces/http/middleware/error-handler.js';
import { createIntakeRouter } from '../src/interfaces/http/v1/intake.controller.js';
import { createCrisisLinesRouter } from '../src/interfaces/http/v1/crisis-lines.controller.js';
import { createConsentRouter } from '../src/interfaces/http/v1/consent.controller.js';
import { createPapRouter } from '../src/interfaces/http/v1/pap.controller.js';
import { createVolunteerRouter } from '../src/interfaces/http/v1/volunteer.controller.js';
import { createAuthRouter } from '../src/interfaces/http/v1/auth.controller.js';
import { createCronRouter } from '../src/interfaces/http/v1/cron.controller.js';
import { createCasesRouter } from '../src/interfaces/http/v1/cases.controller.js';
import { createCoordinatorRouter } from '../src/interfaces/http/v1/coordinator.controller.js';
import { createCoordinatorOnboardingRouter } from '../src/interfaces/http/v1/coordinator-onboarding.controller.js';
import { createAdminRouter } from '../src/interfaces/http/v1/admin.controller.js';
import { createMonitoringRouter } from '../src/interfaces/http/v1/monitoring.controller.js';
import { createReportsRouter } from '../src/interfaces/http/v1/reports.controller.js';
import { createDocsRouter } from '../src/interfaces/http/v1/docs.controller.js';
import { configureSessionValidation } from '../src/interfaces/http/middleware/auth.js';
import { getVolunteerContainer } from '../src/interfaces/http/v1/dependencies.js';

/**
 * API entry point. All routes are versioned under `/api/v1` (see CONTRIBUTING.md).
 *
 * Global cross-cutting security (security headers, CORS, central error handling)
 * is wired here so every route inherits it. Per-route middleware (rate limiting,
 * auth, validation) is applied when the real endpoints are added (Block 3+).
 * The Vercel platform adapter is finalized in Block 8 (deployment).
 */
const config = getConfig();
// CORS allow-list. `CORS_ORIGINS` (comma-separated) overrides the committed config
// so the deployed web origin(s) can be set per-environment on Vercel without a
// rebuild; otherwise fall back to the per-NODE_ENV origins from config.
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  : process.env.NODE_ENV === 'production'
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

// Enforce in-place session destruction (RF-2.7): validate each request's token
// version against the account's current one (bumped on every login). Lazy — the
// Supabase client is only built when a request actually hits an authed route.
configureSessionValidation((userId) => getVolunteerContainer().volunteers.getTokenVersion(userId));

app.get('/health', (c) => {
  return c.json({ status: 'ok', app: config.app.name, uptime_seconds: Math.round(process.uptime()) });
});

app.route('/intake', createIntakeRouter());
app.route('/crisis-lines', createCrisisLinesRouter());
app.route('/consent', createConsentRouter());
app.route('/pap', createPapRouter());
app.route('/auth', createAuthRouter());
app.route('/volunteers', createVolunteerRouter());
app.route('/cases', createCasesRouter());
app.route('/coordinator', createCoordinatorRouter());
app.route('/coordinators', createCoordinatorOnboardingRouter());
app.route('/admin', createAdminRouter());
app.route('/metrics', createMonitoringRouter());
app.route('/reports', createReportsRouter());
app.route('/cron', createCronRouter());
app.route('/', createDocsRouter());

// Vercel serverless entry. `handle` from @hono/node-server/vercel adapts the Hono
// app to Vercel's NODE runtime (Node req/res → Web) — the right adapter here since
// the native deps (@node-rs/argon2) and nodemailer require Node, not Edge (the
// `hono/vercel` adapter is Edge-only and crashes at invocation on Node). `app` is
// exported separately for the local dev server (dev.ts) and the tests.
const vercelListener = handle(app);

// Body-stream bridge (fixes hanging POSTs on Vercel). Vercel's Node runtime buffers
// and parses the request body onto `req.body`, which DRAINS the raw stream. The
// node-server adapter then builds its Web Request from that now-empty stream, so
// `c.req.json()` never resolves and every POST that reads a body times out (GETs,
// having no body, are unaffected — which is why only writes/login hung). We re-expose
// the already-parsed body as `req.rawBody` (a Buffer); the adapter uses that Buffer
// directly instead of reading the drained stream (see its `newRequestFromIncoming`).
export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const vercelReq = req as IncomingMessage & { body?: unknown; rawBody?: Buffer };
  try {
    if (!Buffer.isBuffer(vercelReq.rawBody) && vercelReq.body != null) {
      vercelReq.rawBody = Buffer.isBuffer(vercelReq.body)
        ? vercelReq.body
        : typeof vercelReq.body === 'string'
          ? Buffer.from(vercelReq.body)
          : Buffer.from(JSON.stringify(vercelReq.body));
    }
  } catch {
    // If the body can't be reconstructed, fall through — the adapter still runs.
  }
  return vercelListener(req, res);
}
