import { createHash, randomBytes } from 'node:crypto';

/**
 * Single-use invitation tokens (RF-2.6). The raw token is high-entropy and shown
 * only once (handed to the invitee); only its SHA-256 hash is persisted, so a DB
 * leak never yields a usable token. SHA-256 is appropriate here (unlike argon2id
 * for passwords) because the token already carries ~256 bits of entropy and is
 * not user-chosen, so it is not brute-forceable.
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
