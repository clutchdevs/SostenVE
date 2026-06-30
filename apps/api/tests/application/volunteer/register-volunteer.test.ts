import { describe, expect, it } from 'vitest';
import { registerVolunteer } from '../../../src/application/volunteer/register-volunteer';
import type {
  FpvVerifier,
  Notifier,
  RegistrationNotification,
} from '../../../src/application/volunteer/ports';
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
    async listAll() {
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
}

const notifier: Notifier = {
  async notifyRegistrationApproved() {},
  async notifyRegistrationPending() {},
  async notifyCoordinatorInvitation() {},
};
const audit: AuditLogRepository = { async append() {} };

function recordingNotifier(): Notifier & {
  approved: RegistrationNotification[];
  pending: RegistrationNotification[];
} {
  const approved: RegistrationNotification[] = [];
  const pending: RegistrationNotification[] = [];
  return {
    approved,
    pending,
    async notifyRegistrationApproved(n) {
      approved.push(n);
    },
    async notifyRegistrationPending(n) {
      pending.push(n);
    },
    async notifyCoordinatorInvitation() {},
  };
}

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
  it('activates when the FPV verifier approves AND PAP is declared (cédula+FPV ∧ PAP)', async () => {
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

  it('stays pending when verified but PAP is not declared', async () => {
    const verifier: FpvVerifier = { async verify() {
      return { valid: true };
    } };
    const result = await registerVolunteer(
      { ...input, application: { ...input.application, papTrained: false } },
      { volunteers: fakeVolunteers(), fpvVerifier: verifier, notifier, audit },
    );
    expect(result.status).toBe('pending_approval');
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

  it('records the exception reason for manual review (RF-2.2)', async () => {
    async function reasonFor(
      verifier: FpvVerifier,
      papTrained = true,
    ): Promise<string | undefined> {
      const repo = fakeVolunteers();
      await registerVolunteer(
        { ...input, application: { ...input.application, papTrained } },
        { volunteers: repo, fpvVerifier: verifier, notifier, audit },
      );
      return repo.lastCreated?.pendingReason;
    }

    expect(await reasonFor({ async verify() { return { valid: false }; } })).toBe('fpv_not_found');
    expect(await reasonFor({ async verify() { throw new Error('down'); } })).toBe('fpv_unreachable');
    expect(await reasonFor({ async verify() { return { valid: true }; } }, false)).toBe('pap_not_declared');
    // Activated registrations carry no pending reason.
    expect(await reasonFor({ async verify() { return { valid: true }; } }, true)).toBeUndefined();
  });

  it('autogenerates the password and stores it only as an argon2 hash (RF-2.2.4)', async () => {
    const repo = fakeVolunteers();
    await registerVolunteer(input, {
      volunteers: repo,
      fpvVerifier: { async verify() {
        return { valid: true };
      } },
      notifier,
      audit,
    });
    // No password is supplied by the caller; the use case generates one and only
    // the argon2id hash is persisted.
    expect(repo.lastCreated?.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('emails the temporary password on activation, but not when pending', async () => {
    const verifier: FpvVerifier = { async verify() {
      return { valid: true };
    } };

    const approvedNotifier = recordingNotifier();
    await registerVolunteer(input, {
      volunteers: fakeVolunteers(),
      fpvVerifier: verifier,
      notifier: approvedNotifier,
      audit,
    });
    expect(approvedNotifier.approved).toHaveLength(1);
    expect(approvedNotifier.approved[0]?.temporaryPassword).toBeTruthy();
    expect(approvedNotifier.pending).toHaveLength(0);

    const pendingNotifier = recordingNotifier();
    await registerVolunteer(
      { ...input, application: { ...input.application, papTrained: false } },
      { volunteers: fakeVolunteers(), fpvVerifier: verifier, notifier: pendingNotifier, audit },
    );
    expect(pendingNotifier.pending).toHaveLength(1);
    expect(pendingNotifier.approved).toHaveLength(0);
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
