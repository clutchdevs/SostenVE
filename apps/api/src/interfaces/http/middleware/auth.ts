import type { Context, MiddlewareHandler } from 'hono';
import { ForbiddenError, UnauthorizedError } from '../../../shared/errors/api-error.js';
import { verifyToken, type VerifiedToken } from '../../../shared/security/jwt.js';
import type { RevocationStore } from '../../../shared/security/token-revocation.js';

const AUTH_USER_KEY = 'authUser' as const;

/**
 * Resolves a user's current `token_version` (RF-2.7). Configured once at app
 * bootstrap; when set, every authenticated request checks that the token's
 * version still matches, so a newer login (which bumps the version) destroys
 * older sessions in-place. Left unset in unit tests, where it is a no-op.
 */
type TokenVersionResolver = (userId: string) => Promise<number | null>;
let currentTokenVersionResolver: TokenVersionResolver | null = null;

export function configureSessionValidation(resolver: TokenVersionResolver): void {
  currentTokenVersionResolver = resolver;
}

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

    // In-place session destruction (RF-2.7): reject a token whose version no
    // longer matches the account's current one (e.g. after a newer login).
    if (currentTokenVersionResolver) {
      const current = await currentTokenVersionResolver(user.sub);
      if (current === null || current !== user.tokenVersion) {
        throw new UnauthorizedError('Session superseded by a newer login');
      }
    }

    // Multi-role (#133): authorize when ANY of the account's roles is allowed.
    if (
      options.roles &&
      options.roles.length > 0 &&
      !user.roles.some((r) => options.roles!.includes(r))
    ) {
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

/**
 * The role the caller is currently acting as (#133 multi-role). Endpoints whose
 * behavior differs per role (e.g. the psychologist "my cases" view vs the
 * coordinator board) read this. The client sends `X-Active-Role` for the active
 * portal; it is honored only if the account actually holds that role, otherwise
 * we fall back to the primary role — so single-role callers are unaffected.
 */
export function activeRoleOf(c: Context, user: VerifiedToken): string {
  const requested = c.req.header('X-Active-Role');
  if (requested && user.roles.includes(requested)) return requested;
  return user.role;
}
