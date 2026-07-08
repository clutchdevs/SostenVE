import { beforeAll, describe, expect, it } from 'vitest';
import { decrypt, encrypt } from '../../src/shared/security/encryption.js';

beforeAll(() => {
  // 32-byte key (base64) for AES-256-GCM.
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
});

describe('AES-256-GCM column encryption (ADR-0004)', () => {
  it('roundtrips plaintext through encrypt/decrypt', () => {
    const plaintext = 'Diagnóstico: reacción aguda al estrés';
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('produces different ciphertexts for the same input (random IV)', () => {
    expect(encrypt('same')).not.toBe(encrypt('same'));
  });

  it('does not leak the plaintext in the ciphertext', () => {
    expect(encrypt('secret-value')).not.toContain('secret-value');
  });

  it('fails to decrypt a tampered payload (authentication)', () => {
    const payload = encrypt('integrity matters');
    const parts = payload.split(':');
    const tampered = [parts[0], parts[1], Buffer.from('tampered').toString('base64')].join(':');
    expect(() => decrypt(tampered)).toThrow();
  });

  it('rejects a malformed payload', () => {
    expect(() => decrypt('not-a-valid-payload')).toThrow();
  });
});
