import { describe, expect, it } from 'vitest';
import { approveVolunteer } from '../../../src/application/volunteer/manage-volunteer';
import { verifyPassword } from '../../../src/shared/security/password';
import type {
  Notifier,
  RegistrationNotification,
} from '../../../src/application/volunteer/ports';
import type { Volunteer, VolunteerRepository } from '../../../src/domain/volunteer/volunteer';
import type { AuditLogRepository } from '../../../src/domain/audit/audit';

const volunteer: Volunteer = {
  id: 'vol-1',
  fullName: 'Ana',
  professionalId: 'FPV-1',
  email: 'ana@example.com',
  role: 'psychologist',
  tokenVersion: 1,
  status: 'pending_approval',
  createdAt: new Date(),
};

function fakeRepo(): VolunteerRepository & { status?: string; passwordHash?: string } {
  const repo: VolunteerRepository & { status?: string; passwordHash?: string } = {
    async findById() {
      return volunteer;
    },
    async create() {
      throw new Error('not used');
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
    async listAll() {
      return [];
    },
    async getPasswordHash() {
      return null;
    },
    async updatePasswordHash(_id, passwordHash) {
      repo.passwordHash = passwordHash;
    },
    async setStatus(_id, status) {
      repo.status = status;
    },
    async bumpTokenVersion() {
      return 2;
    },
  };
  return repo;
}

const audit: AuditLogRepository = { async append() {} };

function recordingNotifier(): Notifier & { approved: RegistrationNotification[] } {
  const approved: RegistrationNotification[] = [];
  return {
    approved,
    async notifyRegistrationApproved(n) {
      approved.push(n);
    },
    async notifyRegistrationPending() {},
    async notifyCoordinatorInvitation() {},
    async notifyPasswordReset() {},
  };
}

describe('approveVolunteer', () => {
  it('activates, reissues a working password and emails the credentials (RF-2.2.4)', async () => {
    const repo = fakeRepo();
    const notifier = recordingNotifier();
    await approveVolunteer('vol-1', { id: 'coord-1', role: 'coordinator' }, { volunteers: repo, audit, notifier });

    expect(repo.status).toBe('active');
    // A fresh argon2 hash was stored.
    expect(repo.passwordHash).toMatch(/^\$argon2id\$/);
    // The emailed temporary password matches the stored hash (i.e. it works).
    const emailed = notifier.approved[0]?.temporaryPassword;
    expect(emailed).toBeTruthy();
    expect(await verifyPassword(emailed as string, repo.passwordHash as string)).toBe(true);
  });
});
