import { Hono } from 'hono';
import { getConfig } from '../src/config';
import { buildCors } from '../src/interfaces/http/middleware/cors';
import { buildSecurityHeaders } from '../src/interfaces/http/middleware/security-headers';
import { errorHandler } from '../src/interfaces/http/middleware/error-handler';

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

app.use('*', buildSecurityHeaders());
app.use('*', buildCors(corsOrigins));
app.onError(errorHandler);

app.get('/health', (c) => {
  return c.json({ status: 'ok', app: config.app.name });
});

export default app;
