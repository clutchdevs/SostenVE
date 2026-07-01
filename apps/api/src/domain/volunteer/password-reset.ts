/**
 * Password reset token aggregate and repository port (RF-2.2.4, issue #36).
 *
 * A reset token is a single-use, time-boxed grant a volunteer requests when they
 * lose their password. The raw token lives only in the emailed recovery link;
 * persistence stores its SHA-256 hash (see `tokenHash`). Redeeming it sets a new
 * password and consumes the token.
 */
export interface PasswordResetToken {
  id: string;
  volunteerId: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface NewPasswordResetToken {
  volunteerId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface PasswordResetTokenRepository {
  create(input: NewPasswordResetToken): Promise<PasswordResetToken>;
  /** Looks a token up by the hash of its raw value (for the redeem flow). */
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  /** Marks a token consumed so it can never be redeemed again. */
  markUsed(id: string): Promise<void>;
}

/** True when a reset token can still be redeemed (unused and not expired). */
export function isRedeemable(token: PasswordResetToken, now: Date = new Date()): boolean {
  return token.usedAt === undefined && token.expiresAt.getTime() > now.getTime();
}
