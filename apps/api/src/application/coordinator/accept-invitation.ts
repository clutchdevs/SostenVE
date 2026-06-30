import { ApiError } from '../../shared/errors/api-error';
import { hashPassword } from '../../shared/security/password';
import { hashToken } from '../../shared/security/invitation-token';
import { isAcceptable } from '../../domain/coordinator/invitation';
import type { AuditLogRepository } from '../../domain/audit/audit';
import type { CoordinatorInvitationRepository } from '../../domain/coordinator/invitation';
import type { VolunteerRepository } from '../../domain/volunteer/volunteer';

/** Dependencies for the public coordinator self-activation flow (RF-2.6). */
export interface AcceptInvitationDeps {
  invitations: CoordinatorInvitationRepository;
  volunteers: VolunteerRepository;
  audit: AuditLogRepository;
}

export interface AcceptInvitationInput {
  token: string;
  password: string;
}

export interface AcceptInvitationResult {
  volunteerId: string;
}

/**
 * Consumes a coordinator invitation: validates the token (pending and not
 * expired), creates an `active` coordinator with the chosen password, and marks
 * the invitation accepted. A generic error is used for any invalid/expired token
 * so a caller cannot probe which tokens exist.
 *
 * The invitation is the trust anchor (an admin vetted the coordinator), so no FPV
 * verification is required — unlike psychologist self-registration (RF-2.2).
 */
export async function acceptInvitation(
  input: AcceptInvitationInput,
  deps: AcceptInvitationDeps,
): Promise<AcceptInvitationResult> {
  const invalid = new ApiError(400, 'INVALID_INVITATION', 'Invitation is invalid or has expired');

  const invitation = await deps.invitations.findByTokenHash(hashToken(input.token));
  if (!invitation || !isAcceptable(invitation)) {
    throw invalid;
  }

  const passwordHash = await hashPassword(input.password);
  const volunteer = await deps.volunteers.create({
    fullName: invitation.fullName,
    // Coordinators have no FPV number; reuse the (unique) email as the identifier.
    professionalId: `coord:${invitation.email}`,
    email: invitation.email,
    role: 'coordinator',
    passwordHash,
    status: 'active',
  });

  await deps.invitations.markAccepted(invitation.id, volunteer.id);

  await deps.audit.append({
    userId: volunteer.id,
    role: 'coordinator',
    affectedRecordId: invitation.id,
    actionType: 'coordinator_invitation_accepted',
  });

  return { volunteerId: volunteer.id };
}
