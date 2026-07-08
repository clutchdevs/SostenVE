import { secureHeaders } from 'hono/secure-headers';
import type { MiddlewareHandler } from 'hono';

/**
 * Global HTTP security headers applied to every route: CSP, X-Content-Type-Options,
 * X-Frame-Options, Strict-Transport-Security and Referrer-Policy.
 *
 * The API serves JSON only, so the CSP is restrictive (`default-src 'none'`).
 */
export function buildSecurityHeaders(): MiddlewareHandler {
  return secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'no-referrer',
    strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  });
}
