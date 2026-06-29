import type { Context, MiddlewareHandler } from 'hono';
import { ForbiddenError, UnauthorizedError } from '../../../shared/errors/api-error';
import { verifyToken, type VerifiedToken } from '../../../shared/security/jwt';
import type { RevocationStore } from '../../../shared/security/token-revocation';

const AUTH_USER_KEY = 'authUser' as const;

export interface RequireAuthOptions {
  /** Allowed roles; empty/omitted means any authenticated user. */
  roles?: readonly string[];
  revocationStore?: RevocationStore;
}

function bearerTokenOf(header: string | undefined): string {
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing bearer token');
  }
  return header.slice('Bearer '.length).trim();
}

/**
 * Verifies the access token and (optionally) the caller's role. Sets the verified
 * user on the context for downstream handlers. Authorization by case ownership is
 * enforced per-endpoint in later blocks.
 */
export function requireAuth(options: RequireAuthOptions = {}): MiddlewareHandler {
  return async (c, next) => {
    const token = bearerTokenOf(c.req.header('Authorization'));
    const user = await verifyToken(token, {
      expectedType: 'access',
      revocationStore: options.revocationStore,
    });

    if (options.roles && options.roles.length > 0 && !options.roles.includes(user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    c.set(AUTH_USER_KEY, user);
    await next();
  };
}

export function getAuthUser(c: Context): VerifiedToken {
  const user = c.get(AUTH_USER_KEY) as VerifiedToken | undefined;
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }
  return user;
}
