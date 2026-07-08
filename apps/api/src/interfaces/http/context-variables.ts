import type { VerifiedToken } from '../../shared/security/jwt.js';

/**
 * Typed Hono context variables shared across middleware and handlers.
 * Augments Hono's ContextVariableMap so `c.get`/`c.set` are type-safe.
 */
declare module 'hono' {
  interface ContextVariableMap {
    validated: Record<string, unknown>;
    authUser: VerifiedToken;
  }
}
