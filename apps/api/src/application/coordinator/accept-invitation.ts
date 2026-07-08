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
  password: string;
  /** Structured sign-up fields (RF-2.6.2). */
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  /** FPV number — optional for support/logistics coordinators. */
  fpv?: string;
  phone: string;
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
  const fpv = input.fpv?.trim();
  const volunteer = await deps.volunteers.create({
    fullName: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
    // Identify by FPV when provided; otherwise the (unique) cédula. The email
    // still comes from the invitation, which is address-targeted.
    professionalId: fpv && fpv.length > 0 ? fpv : `coord:${input.documentNumber.trim()}`,
    email: invitation.email,
    role: 'coordinator',
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

  return { volunteerId: volunteer.id };
}
