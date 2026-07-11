import { ApiError } from '../../shared/errors/api-error.js';
import { hashPassword } from '../../shared/security/password.js';
import { hashToken } from '../../shared/security/invitation-token.js';
import { isAcceptable } from '../../domain/coordinator/invitation.js';
import type { AuditLogRepository } from '../../domain/audit/audit.js';
import type { CoordinatorInvitationRepository } from '../../domain/coordinator/invitation.js';
import type { DocumentType, VolunteerRepository } from '../../domain/volunteer/volunteer.js';

/** Dependencies for the public coordinator self-activation flow (RF-2.6). */
export interface AcceptInvitationDeps {
  invitations: CoordinatorInvitationRepository;
  volunteers: VolunteerRepository;
  audit: AuditLogRepository;
}

export interface AcceptInvitationInput {
  token: string;
  /** Structured sign-up fields (RF-2.6.2). Required only when creating a NEW
   *  account; ignored when the invited email already has one (#133). */
  password?: string;
  firstName?: string;
  lastName?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  /** FPV number — optional for support/logistics coordinators. */
  fpv?: string;
  phone?: string;
}

export interface AcceptInvitationResult {
  volunteerId: string;
  /** True when an existing account was granted the role rather than a new one created. */
  roleAdded: boolean;
}

/**
 * Consumes a coordinator invitation: validates the token (pending and not
 * expired), then either
 *  - grants the `coordinator` role to the account that already owns the invited
 *    email (#133 multi-role — e.g. a psychologist who is also a coordinator),
 *    WITHOUT touching their existing password/identity; or
 *  - creates a new `active` coordinator with the submitted sign-up profile.
 * Finally it marks the invitation accepted. A generic error is used for any
 * invalid/expired token so a caller cannot probe which tokens exist.
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

  // Multi-role (#133): if the invited email already has an account, add the
  // coordinator role to it instead of creating a duplicate (which would violate
  // the unique-email index). The existing credentials/identity are untouched.
  const existing = await deps.volunteers.findByEmail(invitation.email);
  if (existing) {
    await deps.volunteers.addRole(existing.id, 'coordinator');
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
    return { volunteerId: existing.id, roleAdded: true };
  }

  // New account: the full sign-up profile is required.
  if (
    !input.firstName?.trim() ||
    !input.lastName?.trim() ||
    !input.documentType ||
    !input.documentNumber?.trim() ||
    !input.phone?.trim() ||
    !input.password
  ) {
    throw new ApiError(400, 'MISSING_FIELDS', 'Missing required sign-up fields');
  }

  const passwordHash = await hashPassword(input.password);
  const fpv = input.fpv?.trim();
  const volunteer = await deps.volunteers.create({
    fullName: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
    // Identify by FPV when provided; otherwise the (unique) cédula. The email
    // still comes from the invitation, which is address-targeted.
    professionalId: fpv && fpv.length > 0 ? fpv : `coord:${input.documentNumber.trim()}`,
    email: invitation.email,
    role: 'coordinator',
    roles: ['coordinator'],
    documentType: input.documentType,
    documentNumber: input.documentNumber.trim(),
    phone: input.phone.trim(),
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

  return { volunteerId: volunteer.id, roleAdded: false };
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
