import { ApiError, UnauthorizedError } from '../../shared/errors/api-error';
import { hashPassword, verifyPassword } from '../../shared/security/password';
import type { AuditLogRepository } from '../../domain/audit/audit';
import type { VolunteerRepository } from '../../domain/volunteer/volunteer';

/** Dependencies for the authenticated password-change flow (RF-2.2.4). */
export interface ChangePasswordDeps {
  volunteers: VolunteerRepository;
  audit: AuditLogRepository;
}

export interface ChangePasswordInput {
  volunteerId: string;
  currentPassword: string;
  newPassword: string;
}

/**
 * Changes the password of the authenticated volunteer after re-verifying the
 * current one (mitigates a hijacked-session takeover). On success the token
 * version is bumped so previously issued tokens stop working — sessions are
 * destroyed in-place (RF-2.7, ADR-0005), so the caller must sign in again.
 */
export async function changePassword(
  input: ChangePasswordInput,
  deps: ChangePasswordDeps,
): Promise<void> {
  const hash = await deps.volunteers.getPasswordHash(input.volunteerId);
  if (!hash || !(await verifyPassword(input.currentPassword, hash))) {
    throw new UnauthorizedError('Current password is incorrect');
  }
  if (input.newPassword === input.currentPassword) {
    throw new ApiError(400, 'SAME_PASSWORD', 'The new password must be different');
  }

  await deps.volunteers.updatePasswordHash(input.volunteerId, await hashPassword(input.newPassword));
  await deps.volunteers.bumpTokenVersion(input.volunteerId);

  await deps.audit.append({
    userId: input.volunteerId,
    affectedRecordId: input.volunteerId,
    actionType: 'password_changed',
  });
}
