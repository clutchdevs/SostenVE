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

function recordingAudit(): AuditLogRepository & { entries: { actionType: string }[] } {
  const entries: { actionType: string }[] = [];
  return { entries, async append(entry) {
    entries.push({ actionType: entry.actionType });
  } };
}

const input = {
  fullName: 'Ana',
  professionalId: 'FPV-123',
  email: 'ana@example.com',
  password: 'a-strong-password',
  application: {
    documentType: 'V' as const,
    documentNumber: '12345678',
    university: 'UCV',
    graduationYear: 2015,
    colegio: 'Colegio de Psicólogos de Miranda',
    modalities: ['distancia' as const],
    availabilitySchedule: [{ dia: 'lunes', bloque: 'manana' }],
    papTrained: true,
    papDetail: 'Curso PAP 2024',
  },
  consentVersion: 'v0.1.0-draft',
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

  it('persists the full applicant profile (RF-2.1.2)', async () => {
    const repo = fakeVolunteers();
    await registerVolunteer(input, {
      volunteers: repo,
      fpvVerifier: { async verify() {
        return { valid: true };
      } },
      notifier,
      audit,
    });
    expect(repo.lastCreated?.application?.documentNumber).toBe('12345678');
    expect(repo.lastCreated?.application?.modalities).toEqual(['distancia']);
    expect(repo.lastCreated?.application?.availabilitySchedule).toHaveLength(1);
    expect(repo.lastCreated?.application?.papTrained).toBe(true);
  });

  it('persists the accepted consent version and timestamp (RF-2.1.1)', async () => {
    const repo = fakeVolunteers();
    await registerVolunteer(input, {
      volunteers: repo,
      fpvVerifier: { async verify() {
        return { valid: true };
      } },
      notifier,
      audit,
    });
    expect(repo.lastCreated?.consentVersion).toBe('v0.1.0-draft');
    expect(repo.lastCreated?.consentAcceptedAt).toBeInstanceOf(Date);
  });

  it('appends an auditable consent_accepted entry with the version', async () => {
    const auditSpy = recordingAudit();
    await registerVolunteer(input, {
      volunteers: fakeVolunteers(),
      fpvVerifier: { async verify() {
        return { valid: true };
      } },
      notifier,
      audit: auditSpy,
    });
    expect(auditSpy.entries.map((e) => e.actionType)).toContain('consent_accepted:v0.1.0-draft');
  });
});
