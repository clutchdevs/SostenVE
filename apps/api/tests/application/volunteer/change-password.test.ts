import { describe, expect, it } from 'vitest';
import { changePassword } from '../../../src/application/volunteer/change-password';
import { hashPassword } from '../../../src/shared/security/password';
import type { AuditEntry, AuditLogRepository } from '../../../src/domain/audit/audit';
import type { Volunteer, VolunteerRepository } from '../../../src/domain/volunteer/volunteer';

const CURRENT = 'current-password';

function volunteer(): Volunteer {
  return {
    id: 'vol-1',
    fullName: 'Ana',
    professionalId: 'V-123',
    email: 'ana@example.com',
    role: 'psychologist',
    tokenVersion: 1,
    status: 'active',
    createdAt: new Date(),
  };
}

interface FakeState {
  hash: string;
  updated: string | null;
  bumped: number;
  entries: AuditEntry[];
}

function deps(state: FakeState): { volunteers: VolunteerRepository; audit: AuditLogRepository } {
  const v = volunteer();
  const volunteers: VolunteerRepository = {
    async create() {
      return v;
    },
    async findById() {
      return v;
    },
    async findByProfessionalId() {
      return v;
    },
    async findByEmail() {
      return v;
    },
    async listByStatus() {
      return [v];
    },
    async listAll() {
      return [v];
    },
    async getPasswordHash() {
      return state.hash;
    },
    async updatePasswordHash(_id, passwordHash) {
      state.updated = passwordHash;
    },
    async setStatus() {},
    async bumpTokenVersion() {
      state.bumped += 1;
      return 2;
    },
  };
  const audit: AuditLogRepository = {
    async append(entry) {
      state.entries.push(entry);
    },
  };
  return { volunteers, audit };
}

async function freshState(): Promise<FakeState> {
  return { hash: await hashPassword(CURRENT), updated: null, bumped: 0, entries: [] };
}

describe('changePassword', () => {
  it('updates the hash, bumps token_version and audits on success', async () => {
    const state = await freshState();
    await changePassword(
      { volunteerId: 'vol-1', currentPassword: CURRENT, newPassword: 'brand-new-password' },
      deps(state),
    );
    expect(state.updated).not.toBeNull();
    expect(state.updated).not.toBe(state.hash);
    expect(state.bumped).toBe(1);
    expect(state.entries.map((e) => e.actionType)).toContain('password_changed');
  });

  it('rejects a wrong current password without touching anything', async () => {
    const state = await freshState();
    await expect(
      changePassword(
        { volunteerId: 'vol-1', currentPassword: 'wrong', newPassword: 'brand-new-password' },
        deps(state),
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(state.updated).toBeNull();
    expect(state.bumped).toBe(0);
  });

  it('rejects reusing the same password', async () => {
    const state = await freshState();
    await expect(
      changePassword(
        { volunteerId: 'vol-1', currentPassword: CURRENT, newPassword: CURRENT },
        deps(state),
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(state.updated).toBeNull();
  });
});
