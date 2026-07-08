import { ApiError } from '../../shared/errors/api-error.js';
import { hashPassword } from '../../shared/security/password.js';
import { generateInvitationToken, hashToken } from '../../shared/security/invitation-token.js';
import { isRedeemable } from '../../domain/volunteer/password-reset.js';
import type { AppConfig } from '../../config/index.js';
import type { AuditLogRepository } from '../../domain/audit/audit.js';
import type { PasswordResetTokenRepository } from '../../domain/volunteer/password-reset.js';
import type { VolunteerRepository } from '../../domain/volunteer/volunteer.js';
import type { Notifier } from './ports.js';

/** Dependencies for requesting a password reset (RF-2.2.4, issue #36). */
export interface RequestPasswordResetDeps {
  volunteers: VolunteerRepository;
  resetTokens: PasswordResetTokenRepository;
  notifier: Notifier;
  audit: AuditLogRepository;
  config: AppConfig;
}

export interface RequestPasswordResetInput {
  email: string;
}

/**
 * Issues a single-use, time-boxed reset token and emails the recovery link. To
 * avoid account enumeration this always resolves the same way: if no active
 * volunteer owns the email, nothing is sent (and no error is raised). Only the
 * token hash is persisted; the raw token travels only in the emailed link.
 */
export async function requestPasswordReset(
  input: RequestPasswordResetInput,
  deps: RequestPasswordResetDeps,
): Promise<void> {
  const volunteer = await deps.volunteers.findByEmail(input.email);
  // Silently no-op for unknown or non-active accounts (no enumeration signal).
  if (!volunteer || volunteer.status !== 'active' || !volunteer.email) {
    return;
  }

  const token = generateInvitationToken();
  const ttlMinutes = deps.config.security.session.password_reset_ttl_minutes;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

  await deps.resetTokens.create({
    volunteerId: volunteer.id,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const resetUrl = `${deps.config.email.password_reset_url}?token=${token}`;
  await deps.notifier.notifyPasswordReset({
    email: volunteer.email,
    fullName: volunteer.fullName,
    resetUrl,
    expiresAt,
  });

  await deps.audit.append({
    userId: volunteer.id,
    affectedRecordId: volunteer.id,
    actionType: 'password_reset_requested',
  });
}

/** Dependencies for redeeming a password reset token (RF-2.2.4, issue #36). */
export interface ResetPasswordDeps {
  volunteers: VolunteerRepository;
  resetTokens: PasswordResetTokenRepository;
  audit: AuditLogRepository;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

/**
 * Redeems a reset token: validates it (unused and not expired), sets the new
 * password, consumes the token, and bumps token_version so any lingering session
 * is destroyed (RF-2.7, ADR-0005). A generic error is used for any invalid or
 * expired token so a caller cannot probe which tokens exist.
 */
export async function resetPassword(input: ResetPasswordInput, deps: ResetPasswordDeps): Promise<void> {
  const invalid = new ApiError(400, 'INVALID_RESET_TOKEN', 'Reset link is invalid or has expired');

  const token = await deps.resetTokens.findByTokenHash(hashToken(input.token));
  if (!token || !isRedeemable(token)) {
    throw invalid;
  }

  await deps.volunteers.updatePasswordHash(token.volunteerId, await hashPassword(input.newPassword));
  await deps.resetTokens.markUsed(token.id);
  await deps.volunteers.bumpTokenVersion(token.volunteerId);

  await deps.audit.append({
    userId: token.volunteerId,
    affectedRecordId: token.volunteerId,
    actionType: 'password_reset',
  });
}
