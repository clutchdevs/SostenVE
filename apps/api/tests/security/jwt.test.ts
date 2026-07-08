import { beforeAll, describe, expect, it } from 'vitest';
import { signToken, verifyToken } from '../../src/shared/security/jwt.js';
import { InMemoryRevocationStore } from '../../src/shared/security/token-revocation.js';

const CLAIMS = { sub: 'user-1', role: 'psychologist', tokenVersion: 1 };

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-value-at-least-32-bytes-long!!';
});

describe('JWT utilities (jose)', () => {
  it('signs and verifies an access token (roundtrip)', async () => {
    const token = await signToken(CLAIMS, { ttlSeconds: 900, type: 'access' });
    const verified = await verifyToken(token, { expectedType: 'access' });
    expect(verified.sub).toBe('user-1');
    expect(verified.role).toBe('psychologist');
    expect(verified.type).toBe('access');
  });

  it('rejects an expired token', async () => {
    const token = await signToken(CLAIMS, { ttlSeconds: -1, type: 'access' });
    await expect(verifyToken(token)).rejects.toThrow();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signToken(CLAIMS, { ttlSeconds: 900, type: 'access' });
    process.env.JWT_SECRET = 'a-totally-different-secret-value-32bytes!!';
    await expect(verifyToken(token)).rejects.toThrow();
    process.env.JWT_SECRET = 'test-secret-value-at-least-32-bytes-long!!';
  });

  it('rejects a token whose tokenVersion is stale', async () => {
    const token = await signToken(CLAIMS, { ttlSeconds: 900, type: 'access' });
    await expect(verifyToken(token, { expectedTokenVersion: 2 })).rejects.toThrow();
  });

  it('rejects the expected type mismatch', async () => {
    const refresh = await signToken(CLAIMS, { ttlSeconds: 900, type: 'refresh' });
    await expect(verifyToken(refresh, { expectedType: 'access' })).rejects.toThrow();
  });

  it('rejects a revoked token (denylist by jti)', async () => {
    const store = new InMemoryRevocationStore();
    const token = await signToken(CLAIMS, { ttlSeconds: 900, type: 'access' });
    const verified = await verifyToken(token, { revocationStore: store });
    await store.revoke(verified.jti, verified.expiresAtMs);
    await expect(verifyToken(token, { revocationStore: store })).rejects.toThrow();
  });
});
