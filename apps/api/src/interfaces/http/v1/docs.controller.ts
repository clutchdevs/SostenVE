import { Hono } from 'hono';
import { swaggerUI } from '@hono/swagger-ui';
import { buildOpenApiDocument } from '../openapi-document.js';

/**
 * Serves the OpenAPI document and an interactive Swagger UI for all endpoints.
 *
 * The global CSP (`default-src 'none'`) would block Swagger UI's assets, so the
 * `/docs` HTML page gets a relaxed CSP here (the global security headers skip this
 * path — see api/index.ts). The JSON document keeps the strict default CSP.
 */
export function createDocsRouter(): Hono {
  const router = new Hono();

  router.get('/openapi.json', (c) => c.json(buildOpenApiDocument()));

  router.use('/docs', async (c, next) => {
    await next();
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self'",
    );
  });
  router.get('/docs', swaggerUI({ url: '/api/v1/openapi.json' }));

  return router;
}
