import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/shared/security/password.js';

describe('password hashing (argon2id)', () => {
  it('produces a hash different from the plaintext', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).not.toContain('correct horse battery staple');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('s3cret-pass');
    expect(await verifyPassword('s3cret-pass', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('s3cret-pass');
    expect(await verifyPassword('wrong-pass', hash)).toBe(false);
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    expect(await verifyPassword('whatever', 'not-a-valid-hash')).toBe(false);
  });
});
