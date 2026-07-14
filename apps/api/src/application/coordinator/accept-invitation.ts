import { ApiError } from '../../shared/errors/api-error.js';
import { hashToken } from '../../shared/security/invitation-token.js';
import { isAcceptable } from '../../domain/coordinator/invitation.js';
import type { AuditLogRepository } from '../../domain/audit/audit.js';
import type { CoordinatorInvitationRepository } from '../../domain/coordinator/invitation.js';
import type { VolunteerRepository } from '../../domain/volunteer/volunteer.js';

/** Dependencies for the public coordinator self-activation flow (RF-2.6). */
export interface AcceptInvitationDeps {
  invitations: CoordinatorInvitationRepository;
  volunteers: VolunteerRepository;
  audit: AuditLogRepository;
}

export interface AcceptInvitationInput {
  token: string;
}

export interface AcceptInvitationResult {
  volunteerId: string;
}

/**
 * Consumes a coordinator invitation by adding the `coordinator` role to the
 * account that already owns the invited email (#133 multi-role). Every coordinator
 * is a registered psychologist first (canonical order): there is no separate
 * coordinator sign-up, so if the email has no account yet the invitation cannot be
 * accepted — the person must register (and be validated) as a psychologist first.
 *
 * The existing credentials/identity are untouched (no password or profile is
 * collected here). A generic error is used for any invalid/expired token so a
 * caller cannot probe which tokens exist.
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

  const existing = await deps.volunteers.findByEmail(invitation.email);
  if (!existing) {
    throw new ApiError(
      409,
      'NO_ACCOUNT',
      'Este correo no tiene una cuenta. Regístrate y valídate como psicólogo antes de activar el rol de coordinador.',
    );
  }

  await deps.volunteers.addRole(existing.id, 'coordinator');
  // A previously deactivated account is reactivated when it takes on coordination.
  if (existing.status !== 'active') {
    await deps.volunteers.setStatus(existing.id, 'active');
  }

  await deps.invitations.markAccepted(invitation.id, existing.id);

  await deps.audit.append({
    userId: existing.id,
    role: 'coordinator',
    affectedRecordId: invitation.id,
    actionType: 'coordinator_invitation_accepted',
  });

  return { volunteerId: existing.id };
}

export interface InvitationInfo {
  email: string;
  fullName: string;
  /** True when the invited email already has an account (the accept will add a role). */
  existingAccount: boolean;
}

/**
 * Public preview of a still-acceptable invitation, so the onboarding UI can adapt:
 * an existing account only needs to confirm (the role is added), while a brand-new
 * one must fill the full sign-up form. Uses the same generic error as accept so a
 * caller cannot probe which tokens exist.
 */
export async function getInvitationInfo(
  token: string,
  deps: Pick<AcceptInvitationDeps, 'invitations' | 'volunteers'>,
): Promise<InvitationInfo> {
  const invitation = await deps.invitations.findByTokenHash(hashToken(token));
  if (!invitation || !isAcceptable(invitation)) {
    throw new ApiError(400, 'INVALID_INVITATION', 'Invitation is invalid or has expired');
  }
  const existing = await deps.volunteers.findByEmail(invitation.email);
  return {
    email: invitation.email,
    fullName: invitation.fullName,
    existingAccount: existing !== null,
  };
}
