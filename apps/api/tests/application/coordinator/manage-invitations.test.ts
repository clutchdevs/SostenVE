import { describe, expect, it } from 'vitest';
import { getConfig } from '../../../src/config/index.js';
import {
  inviteCoordinator,
  revokeInvitation,
} from '../../../src/application/coordinator/manage-invitations.js';
import { hashToken } from '../../../src/shared/security/invitation-token.js';
import type { InvitationNotification, Notifier } from '../../../src/application/volunteer/ports.js';
import type { AuditLogRepository } from '../../../src/domain/audit/audit.js';
import type {
  CoordinatorInvitation,
  CoordinatorInvitationRepository,
  NewCoordinatorInvitation,
} from '../../../src/domain/coordinator/invitation.js';

function fixture(overrides: Partial<CoordinatorInvitation> = {}): CoordinatorInvitation {
  return {
    id: 'inv-1',
    email: 'coord@example.com',
    fullName: 'Coral',
    status: 'pending',
    expiresAt: new Date(Date.now() + 86_400_000),
    createdAt: new Date(),
    ...overrides,
  };
}

function repoWith(invitation: CoordinatorInvitation | null) {
  const created: NewCoordinatorInvitation[] = [];
  const repo: CoordinatorInvitationRepository = {
    async create(input) {
      created.push(input);
      return fixture({ email: input.email, fullName: input.fullName, expiresAt: input.expiresAt });
    },
    async list() {
      return invitation ? [invitation] : [];
    },
    async findById(id) {
      return invitation && invitation.id === id ? invitation : null;
    },
    async findByTokenHash() {
      return invitation;
    },
    async markAccepted() {},
    async revoke(id) {
      return fixture({ id, status: 'revoked' });
    },
  };
  return { repo, created };
}

function recordingNotifier(): Notifier & { invitations: InvitationNotification[] } {
  const invitations: InvitationNotification[] = [];
  return {
    invitations,
    async notifyRegistrationApproved() {},
    async notifyRegistrationPending() {},
    async notifyCoordinatorInvitation(n) {
      invitations.push(n);
    },
    async notifyPasswordReset() {},
  };
}

function recordingAudit(): AuditLogRepository & { actions: string[] } {
  const actions: string[] = [];
  return {
    actions,
    async append(entry) {
      actions.push(entry.actionType);
    },
  };
}

describe('inviteCoordinator', () => {
  it('mints a token, stores only its hash, emails the link and audits', async () => {
    const repo = repoWith(null);
    const notifier = recordingNotifier();
    const audit = recordingAudit();

    const { token } = await inviteCoordinator(
      { email: 'coord@example.com', fullName: 'Coral' },
      'admin-1',
      { invitations: repo.repo, notifier, audit, config: getConfig() },
    );

    expect(token).toBeTruthy();
    // Persisted value is the hash, never the raw token.
    const stored = repo.created[0]!;
    expect(stored.tokenHash).toBe(hashToken(token));
    expect(stored.tokenHash).not.toBe(token);
    // The invite email carries the raw token in the accept URL.
    expect(notifier.invitations[0]!.acceptUrl).toContain(token);
    expect(audit.actions).toContain('coordinator_invited');
  });
});

describe('revokeInvitation', () => {
  it('revokes a pending invitation and audits it', async () => {
    const repo = repoWith(fixture());
    const audit = recordingAudit();
    const result = await revokeInvitation('inv-1', 'admin-1', {
      invitations: repo.repo,
      notifier: recordingNotifier(),
      audit,
      config: getConfig(),
    });
    expect(result.status).toBe('revoked');
    expect(audit.actions).toContain('coordinator_invitation_revoked');
  });

  it('refuses to revoke a non-pending invitation', async () => {
    const repo = repoWith(fixture({ status: 'accepted' }));
    await expect(
      revokeInvitation('inv-1', 'admin-1', {
        invitations: repo.repo,
        notifier: recordingNotifier(),
        audit: recordingAudit(),
        config: getConfig(),
      }),
    ).rejects.toThrow();
  });

  it('throws when the invitation does not exist', async () => {
    const repo = repoWith(null);
    await expect(
      revokeInvitation('missing', 'admin-1', {
        invitations: repo.repo,
        notifier: recordingNotifier(),
        audit: recordingAudit(),
        config: getConfig(),
      }),
    ).rejects.toThrow();
  });
});
