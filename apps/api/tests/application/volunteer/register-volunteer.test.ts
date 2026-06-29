import { describe, expect, it } from 'vitest';
import { registerVolunteer } from '../../../src/application/volunteer/register-volunteer';
import type { FpvVerifier, Notifier } from '../../../src/application/volunteer/ports';
import type {
  NewVolunteer,
  Volunteer,
  VolunteerRepository,
} from '../../../src/domain/volunteer/volunteer';
import type { AuditLogRepository } from '../../../src/domain/audit/audit';

function fakeVolunteers(): VolunteerRepository & { lastCreated?: NewVolunteer } {
  return {
    lastCreated: undefined,
    async create(input: NewVolunteer): Promise<Volunteer> {
      this.lastCreated = input;
      return {
        id: 'vol-1',
        fullName: input.fullName,
        professionalId: input.professionalId,
        email: input.email,
        role: input.role ?? 'psychologist',
        tokenVersion: 1,
        status: input.status ?? 'pending_approval',
        createdAt: new Date(),
      };
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
    async setStatus() {},
    async bumpTokenVersion() {
      return 2;
    },
  };
}

const notifier: Notifier = {
  async notifyRegistrationApproved() {},
  async notifyRegistrationPending() {},
};
const audit: AuditLogRepository = { async append() {} };

const input = {
  fullName: 'Ana',
  professionalId: 'V-123',
  email: 'ana@example.com',
  password: 'a-strong-password',
};

describe('registerVolunteer', () => {
  it('activates the volunteer when the FPV verifier approves', async () => {
    const verifier: FpvVerifier = { async verify() {
      return { valid: true };
    } };
    const result = await registerVolunteer(input, {
      volunteers: fakeVolunteers(),
      fpvVerifier: verifier,
      notifier,
      audit,
    });
    expect(result.status).toBe('active');
  });

  it('marks pending_approval when the verifier rejects', async () => {
    const verifier: FpvVerifier = { async verify() {
      return { valid: false };
    } };
    const result = await registerVolunteer(input, {
      volunteers: fakeVolunteers(),
      fpvVerifier: verifier,
      notifier,
      audit,
    });
    expect(result.status).toBe('pending_approval');
  });

  it('falls back to pending_approval when the verifier throws (outage / breaker open)', async () => {
    const verifier: FpvVerifier = { async verify() {
      throw new Error('FPV unavailable');
    } };
    const result = await registerVolunteer(input, {
      volunteers: fakeVolunteers(),
      fpvVerifier: verifier,
      notifier,
      audit,
    });
    expect(result.status).toBe('pending_approval');
  });

  it('never stores the plaintext password', async () => {
    const repo = fakeVolunteers();
    await registerVolunteer(input, {
      volunteers: repo,
      fpvVerifier: { async verify() {
        return { valid: true };
      } },
      notifier,
      audit,
    });
    expect(repo.lastCreated?.passwordHash).toBeDefined();
    expect(repo.lastCreated?.passwordHash).not.toBe(input.password);
  });
});
