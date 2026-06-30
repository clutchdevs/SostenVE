import { beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation } from '../../../src/application/coordinator/accept-invitation';
import { hashToken } from '../../../src/shared/security/invitation-token';
import { verifyPassword } from '../../../src/shared/security/password';
import type { AuditLogRepository } from '../../../src/domain/audit/audit';
import type {
  CoordinatorInvitation,
  CoordinatorInvitationRepository,
  NewCoordinatorInvitation,
} from '../../../src/domain/coordinator/invitation';
import type {
  NewVolunteer,
  Volunteer,
  VolunteerRepository,
} from '../../../src/domain/volunteer/volunteer';

const TOKEN = 'a-raw-invitation-token';

function invitationFixture(overrides: Partial<CoordinatorInvitation> = {}): CoordinatorInvitation {
  return {
    id: 'inv-1',
    email: 'coord@example.com',
    fullName: 'Coral Coordinadora',
    status: 'pending',
    expiresAt: new Date(Date.now() + 86_400_000),
    createdAt: new Date(),
    ...overrides,
  };
}

function invitationRepo(invitation: CoordinatorInvitation | null) {
  const calls = { accepted: [] as { id: string; volunteerId: string }[] };
  const repo: CoordinatorInvitationRepository = {
    async create(_input: NewCoordinatorInvitation) {
      throw new Error('not used');
    },
    async list() {
      return invitation ? [invitation] : [];
    },
    async findById(id) {
      return invitation && invitation.id === id ? invitation : null;
    },
    async findByTokenHash(tokenHash) {
      return invitation && hashToken(TOKEN) === tokenHash ? invitation : null;
    },
    async markAccepted(id, volunteerId) {
      calls.accepted.push({ id, volunteerId });
    },
    async revoke(id) {
      return invitationFixture({ id, status: 'revoked' });
    },
  };
  return { repo, calls };
}

function volunteerRepo() {
  const created: NewVolunteer[] = [];
  const repo: VolunteerRepository = {
    async create(input) {
      created.push(input);
      const volunteer: Volunteer = {
        id: 'vol-new',
        fullName: input.fullName,
        professionalId: input.professionalId,
        email: input.email,
        role: input.role ?? 'coordinator',
        tokenVersion: 1,
        status: input.status ?? 'active',
        createdAt: new Date(),
      };
      return volunteer;
    },
    async findById() {
      return null;
    },
    async findByProfessionalId() {
      return null;
    },
    async findByEmail() {
      return null;
    },
    async listByStatus() {
      return [];
    },
    async getPasswordHash() {
      return null;
    },
    async updatePasswordHash() {},
    async setStatus() {},
    async bumpTokenVersion() {
      return 2;
    },
  };
  return { repo, created };
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

beforeAll(() => {
  process.env.JWT_SECRET ??= 'test-secret-value-at-least-32-bytes-long!!';
});

describe('acceptInvitation', () => {
  it('activates a coordinator from a valid token and consumes the invitation', async () => {
    const invitations = invitationRepo(invitationFixture());
    const volunteers = volunteerRepo();
    const audit = recordingAudit();

    const result = await acceptInvitation(
      { token: TOKEN, password: 'a-strong-password' },
      { invitations: invitations.repo, volunteers: volunteers.repo, audit },
    );

    expect(result.volunteerId).toBe('vol-new');
    const created = volunteers.created[0]!;
    expect(created.role).toBe('coordinator');
    expect(created.status).toBe('active');
    expect(created.email).toBe('coord@example.com');
    // Password is hashed, not stored in clear.
    expect(created.passwordHash).not.toBe('a-strong-password');
    expect(await verifyPassword('a-strong-password', created.passwordHash)).toBe(true);
    expect(invitations.calls.accepted).toEqual([{ id: 'inv-1', volunteerId: 'vol-new' }]);
    expect(audit.actions).toContain('coordinator_invitation_accepted');
  });

  it('rejects an unknown token without creating a volunteer', async () => {
    const invitations = invitationRepo(invitationFixture());
    const volunteers = volunteerRepo();
    await expect(
      acceptInvitation(
        { token: 'wrong-token', password: 'a-strong-password' },
        { invitations: invitations.repo, volunteers: volunteers.repo, audit: recordingAudit() },
      ),
    ).rejects.toThrow();
    expect(volunteers.created).toHaveLength(0);
  });

  it('rejects an expired invitation', async () => {
    const invitations = invitationRepo(
      invitationFixture({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const volunteers = volunteerRepo();
    await expect(
      acceptInvitation(
        { token: TOKEN, password: 'a-strong-password' },
        { invitations: invitations.repo, volunteers: volunteers.repo, audit: recordingAudit() },
      ),
    ).rejects.toThrow();
    expect(volunteers.created).toHaveLength(0);
  });

  it('rejects an already-accepted invitation', async () => {
    const invitations = invitationRepo(invitationFixture({ status: 'accepted' }));
    const volunteers = volunteerRepo();
    await expect(
      acceptInvitation(
        { token: TOKEN, password: 'a-strong-password' },
        { invitations: invitations.repo, volunteers: volunteers.repo, audit: recordingAudit() },
      ),
    ).rejects.toThrow();
    expect(volunteers.created).toHaveLength(0);
  });
});
