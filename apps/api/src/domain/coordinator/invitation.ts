/**
 * Coordinator invitation aggregate and repository port (RF-2.6).
 *
 * An invitation is a single-use, time-boxed grant created by an admin so a
 * coordinator can register without going through the FPV self-sign-up flow. The
 * raw token lives only in the email/link handed to the coordinator; persistence
 * stores its hash (see `tokenHash`).
 */
export type InvitationStatus = 'pending' | 'accepted' | 'revoked';

export interface CoordinatorInvitation {
  id: string;
  email: string;
  fullName: string;
  status: InvitationStatus;
  invitedBy?: string;
  volunteerId?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

export interface NewCoordinatorInvitation {
  email: string;
  fullName: string;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
}

export interface CoordinatorInvitationRepository {
  create(input: NewCoordinatorInvitation): Promise<CoordinatorInvitation>;
  list(): Promise<CoordinatorInvitation[]>;
  findById(id: string): Promise<CoordinatorInvitation | null>;
  /** Looks an invitation up by the hash of its token (for the accept flow). */
  findByTokenHash(tokenHash: string): Promise<CoordinatorInvitation | null>;
  /** Marks an invitation consumed, linking the coordinator row it created. */
  markAccepted(id: string, volunteerId: string): Promise<void>;
  revoke(id: string): Promise<CoordinatorInvitation>;
}

/** True when an invitation can still be accepted (pending and not expired). */
export function isAcceptable(invitation: CoordinatorInvitation, now: Date = new Date()): boolean {
  return invitation.status === 'pending' && invitation.expiresAt.getTime() > now.getTime();
}
