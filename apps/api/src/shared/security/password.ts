import { Algorithm, hashSync, verifySync } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';

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

// Use the SYNCHRONOUS argon2 bindings, not the async ones. The async variants
// (`hash`/`verify`) run on a native worker thread whose callback can silently
// never resolve when the module is bundled into a serverless function (Vercel),
// hanging the request until the platform timeout. The sync variants are CPU-bound
// but fast (~50-100ms at these params) and safe in a per-request serverless model.
export async function hashPassword(plain: string): Promise<string> {
  return hashSync(plain, ARGON2_OPTIONS);
}

/**
 * Generates a high-entropy temporary password for automated sign-up (RF-2.2.4).
 * 24 random bytes (~192 bits) encoded as URL-safe base64 — the user never picks
 * their password; it is emailed to them. Never log the return value.
 */
export function generatePassword(): string {
  return randomBytes(24).toString('base64url');
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  try {
    return verifySync(passwordHash, plain);
  } catch {
    // A malformed hash must not crash auth; treat as a failed verification.
    return false;
  }
}
