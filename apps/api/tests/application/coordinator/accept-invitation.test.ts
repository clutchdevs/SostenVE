import { beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation } from '../../../src/application/coordinator/accept-invitation.js';
import { hashToken } from '../../../src/shared/security/invitation-token.js';
import type { AuditLogRepository } from '../../../src/domain/audit/audit.js';
import type {
  CoordinatorInvitation,
  CoordinatorInvitationRepository,
  NewCoordinatorInvitation,
} from '../../../src/domain/coordinator/invitation.js';
import type {
  NewVolunteer,
  Volunteer,
  VolunteerRepository,
} from '../../../src/domain/volunteer/volunteer.js';

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

/** Fake volunteer repo. Pass `existing` to simulate the invited email already
 *  having an account (#133) — then accept adds a role instead of creating one. */
function volunteerRepo(existing: Volunteer | null = null) {
  const created: NewVolunteer[] = [];
  const roleAdds: { id: string; role: string }[] = [];
  const statusSets: { id: string; status: string }[] = [];
  const repo: VolunteerRepository = {
    async create(input) {
      created.push(input);
      const volunteer: Volunteer = {
        id: 'vol-new',
        fullName: input.fullName,
        professionalId: input.professionalId,
        email: input.email,
        role: input.role ?? 'coordinator',
        roles: input.roles ?? [input.role ?? 'coordinator'],
        tokenVersion: 1,
        status: input.status ?? 'active',
        createdAt: new Date(),
      };
      return volunteer;
    },
    async addRole(id, role) {
      roleAdds.push({ id, role });
    },
    async findById() {
      return existing;
    },
    async getDetailById() {
      return null;
    },
    async findByProfessionalId() {
      return null;
    },
    async findByEmail() {
      return existing;
    },
    async listByStatus() {
      return existing ? [existing] : [];
    },
    async listAll() {
      return existing ? [existing] : [];
    },
    async getPasswordHash() {
      return null;
    },
    async updatePasswordHash() {},
    async setStatus(id, status) {
      statusSets.push({ id, status });
    },
    async getTokenVersion() {
      return 1;
    },
    async bumpTokenVersion() {
      return 2;
    },
  };
  return { repo, created, roleAdds, statusSets };
}

function existingPsychologist(overrides: Partial<Volunteer> = {}): Volunteer {
  return {
    id: 'psy-existing',
    fullName: 'Ana Psicóloga',
    professionalId: 'FPV-PSY',
    email: 'coord@example.com',
    role: 'psychologist',
    roles: ['psychologist'],
    tokenVersion: 1,
    status: 'active',
    createdAt: new Date(),
    ...overrides,
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

beforeAll(() => {
  process.env.JWT_SECRET ??= 'test-secret-value-at-least-32-bytes-long!!';
});

describe('acceptInvitation', () => {
  it('adds the coordinator role to the account that already has the invited email (#133)', async () => {
    const invitations = invitationRepo(invitationFixture());
    const volunteers = volunteerRepo(existingPsychologist());
    const audit = recordingAudit();

    // No profile/password: every coordinator is a registered psychologist first.
    const result = await acceptInvitation(
      { token: TOKEN },
      { invitations: invitations.repo, volunteers: volunteers.repo, audit },
    );

    expect(result).toEqual({ volunteerId: 'psy-existing' });
    expect(volunteers.roleAdds).toEqual([{ id: 'psy-existing', role: 'coordinator' }]);
    // No duplicate account is created (the previous bug).
    expect(volunteers.created).toHaveLength(0);
    expect(invitations.calls.accepted).toEqual([{ id: 'inv-1', volunteerId: 'psy-existing' }]);
    expect(audit.actions).toContain('coordinator_invitation_accepted');
  });

  it('reactivates an inactive existing account when granting the coordinator role', async () => {
    const invitations = invitationRepo(invitationFixture());
    const volunteers = volunteerRepo(existingPsychologist({ status: 'inactive' }));

    await acceptInvitation(
      { token: TOKEN },
      { invitations: invitations.repo, volunteers: volunteers.repo, audit: recordingAudit() },
    );

    expect(volunteers.statusSets).toEqual([{ id: 'psy-existing', status: 'active' }]);
    expect(volunteers.roleAdds).toEqual([{ id: 'psy-existing', role: 'coordinator' }]);
  });

  it('rejects the invitation when the invited email has no account yet', async () => {
    const invitations = invitationRepo(invitationFixture());
    const volunteers = volunteerRepo(); // no existing account for the email
    await expect(
      acceptInvitation(
        { token: TOKEN },
        { invitations: invitations.repo, volunteers: volunteers.repo, audit: recordingAudit() },
      ),
    ).rejects.toThrow();
    expect(volunteers.roleAdds).toHaveLength(0);
    expect(invitations.calls.accepted).toHaveLength(0);
  });

  it('rejects an unknown token', async () => {
    const invitations = invitationRepo(invitationFixture());
    const volunteers = volunteerRepo(existingPsychologist());
    await expect(
      acceptInvitation(
        { token: 'wrong-token' },
        { invitations: invitations.repo, volunteers: volunteers.repo, audit: recordingAudit() },
      ),
    ).rejects.toThrow();
    expect(volunteers.roleAdds).toHaveLength(0);
  });

  it('rejects an expired invitation', async () => {
    const invitations = invitationRepo(
      invitationFixture({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const volunteers = volunteerRepo(existingPsychologist());
    await expect(
      acceptInvitation(
        { token: TOKEN },
        { invitations: invitations.repo, volunteers: volunteers.repo, audit: recordingAudit() },
      ),
    ).rejects.toThrow();
    expect(volunteers.roleAdds).toHaveLength(0);
  });

  it('rejects an already-accepted invitation', async () => {
    const invitations = invitationRepo(invitationFixture({ status: 'accepted' }));
    const volunteers = volunteerRepo(existingPsychologist());
    await expect(
      acceptInvitation(
        { token: TOKEN },
        { invitations: invitations.repo, volunteers: volunteers.repo, audit: recordingAudit() },
      ),
    ).rejects.toThrow();
    expect(volunteers.roleAdds).toHaveLength(0);
  });
});
