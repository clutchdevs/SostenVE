import { createHmac } from 'node:crypto';

/**
 * Pseudonymized identifier generation (ADR-0011).
 *
 * Links the separated PII table to the clinical/operational data without storing
 * identity alongside clinical content. Uses HMAC-SHA256 with a secret salt so the
 * id is deterministic per person (same natural key → same id, enabling repeat
 * requests to map to one pseudonym) yet opaque and unlinkable without the salt.
 *
 * Pure and deterministic (node:crypto is a platform primitive); the secret salt
 * is injected by the application layer from PSEUDONYMIZATION_SALT.
 */
export function generatePseudonymId(naturalKey: string, salt: string): string {
  const normalized = naturalKey.trim().toLowerCase();
  if (!normalized) {
    throw new Error('generatePseudonymId requires a non-empty natural key');
  }
  if (!salt) {
    throw new Error('generatePseudonymId requires a non-empty salt');
  }
  return createHmac('sha256', salt).update(normalized).digest('hex');
}
