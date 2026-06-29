import { Algorithm, hash, verify } from '@node-rs/argon2';

/**
 * Password hashing with argon2id (see ADR-0005).
 *
 * Parameters are explicit and documented, not library defaults. Values follow
 * OWASP guidance for argon2id (>= 19 MiB memory, time cost 2, parallelism 1) and
 * can be tuned later as a documented decision.
 */
const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456, // KiB (~19 MiB)
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain);
  } catch {
    // A malformed hash must not crash auth; treat as a failed verification.
    return false;
  }
}
