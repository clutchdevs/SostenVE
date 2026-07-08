import { ApiError } from '../../shared/errors/api-error.js';
import { generateInvitationToken, hashToken } from '../../shared/security/invitation-token.js';
import type { AppConfig } from '../../config/index.js';
import type { AuditLogRepository } from '../../domain/audit/audit.js';
import type {
  CoordinatorInvitation,
  CoordinatorInvitationRepository,
} from '../../domain/coordinator/invitation.js';
import type { Notifier } from '../volunteer/ports.js';

/** Dependencies for issuing and managing coordinator invitations (RF-2.6). */
export interface InvitationDeps {
  invitations: CoordinatorInvitationRepository;
  notifier: Notifier;
  audit: AuditLogRepository;
  config: AppConfig;
}

export interface InviteCoordinatorInput {
  email: string;
  fullName: string;
}

export interface InviteCoordinatorResult {
  invitation: CoordinatorInvitation;
  /** Raw single-use token — returned ONCE to the admin; never persisted/logged. */
  token: string;
}

/**
 * Issues a coordinator invitation: mints a single-use token, stores only its
 * hash with a TTL, emails the invitee a link to complete sign-up, and audits the
 * action. The raw token is returned to the admin so it can be shared out-of-band
 * if email delivery is unavailable.
 */
export async function inviteCoordinator(
  input: InviteCoordinatorInput,
  adminId: string,
  deps: InvitationDeps,
): Promise<InviteCoordinatorResult> {
  const token = generateInvitationToken();
  const ttlDays = deps.config.security.session.invitation_ttl_days;
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);

  const invitation = await deps.invitations.create({
    email: input.email,
    fullName: input.fullName,
    tokenHash: hashToken(token),
    invitedBy: adminId,
    expiresAt,
  });

  const acceptUrl = `${deps.config.email.coordinator_invite_url}?token=${token}`;
  await deps.notifier.notifyCoordinatorInvitation({
    email: input.email,
    fullName: input.fullName,
    acceptUrl,
    expiresAt,
  });

  await deps.audit.append({
    userId: adminId,
    role: 'admin',
    affectedRecordId: invitation.id,
    actionType: 'coordinator_invited',
  });

  return { invitation, token };
}

export function listInvitations(deps: InvitationDeps): Promise<CoordinatorInvitation[]> {
  return deps.invitations.list();
}

/** Revokes a still-pending invitation so its token can no longer be accepted. */
export async function revokeInvitation(
  id: string,
  adminId: string,
  deps: InvitationDeps,
): Promise<CoordinatorInvitation> {
  const existing = await deps.invitations.findById(id);
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Invitation not found');
  if (existing.status !== 'pending') {
    throw new ApiError(409, 'INVITATION_NOT_PENDING', 'Only a pending invitation can be revoked');
  }
  const invitation = await deps.invitations.revoke(id);
  await deps.audit.append({
    userId: adminId,
    role: 'admin',
    affectedRecordId: id,
    actionType: 'coordinator_invitation_revoked',
  });
  return invitation;
}
