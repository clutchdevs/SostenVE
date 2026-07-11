import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { UnauthorizedError } from '../errors/api-error.js';
import type { RevocationStore } from './token-revocation.js';

/**
 * JWT signing/verification with `jose` (see ADR-0005).
 *
 * Access tokens are short-lived; refresh tokens longer-lived. The payload carries
 * the user role and a `tokenVersion` so a version bump invalidates old tokens, plus
 * a `jti` for denylist-based immediate revocation. `JWT_SECRET` is read lazily so
 * build/tests do not require it until a token is actually signed/verified.
 */
export type TokenType = 'access' | 'refresh';

export interface TokenClaims {
  sub: string;
  /** Primary role (default redirect / back-compat). */
  role: string;
  /** All roles the account holds (#133); defaults to `[role]` when omitted. */
  roles?: string[];
  tokenVersion: number;
}

export interface SignOptions {
  ttlSeconds: number;
  type: TokenType;
}

export interface VerifyOptions {
  expectedType?: TokenType;
  expectedTokenVersion?: number;
  revocationStore?: RevocationStore;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(claims: TokenClaims, options: SignOptions): Promise<string> {
  return new SignJWT({
    role: claims.role,
    roles: claims.roles ?? [claims.role],
    tokenVersion: claims.tokenVersion,
    type: options.type,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${options.ttlSeconds}s`)
    .sign(getSecret());
}

export interface VerifiedToken extends TokenClaims {
  /** Always populated on a verified token (falls back to `[role]`). */
  roles: string[];
  jti: string;
  type: TokenType;
  expiresAtMs: number;
}

export async function verifyToken(
  token: string,
  options: VerifyOptions = {},
): Promise<VerifiedToken> {
  let payload: JWTPayload & {
    role?: unknown;
    roles?: unknown;
    tokenVersion?: unknown;
    type?: unknown;
  };
  try {
    ({ payload } = await jwtVerify(token, getSecret()));
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  const { sub, jti, exp, role, roles, tokenVersion, type } = payload;
  if (!sub || !jti || typeof role !== 'string' || typeof tokenVersion !== 'number') {
    throw new UnauthorizedError('Malformed token');
  }
  // Back-compat: tokens issued before multi-role carry no `roles` — fall back to
  // the single primary role so existing sessions keep working across the rollout.
  const roleSet =
    Array.isArray(roles) && roles.every((r) => typeof r === 'string')
      ? (roles as string[])
      : [role];
  if (options.expectedType && type !== options.expectedType) {
    throw new UnauthorizedError('Unexpected token type');
  }
  if (
    options.expectedTokenVersion !== undefined &&
    tokenVersion !== options.expectedTokenVersion
  ) {
    throw new UnauthorizedError('Token has been revoked');
  }
  if (options.revocationStore && (await options.revocationStore.isRevoked(jti))) {
    throw new UnauthorizedError('Token has been revoked');
  }

  return {
    sub,
    role,
    roles: roleSet,
    tokenVersion,
    jti,
    type: type as TokenType,
    expiresAtMs: (exp ?? 0) * 1000,
  };
}
