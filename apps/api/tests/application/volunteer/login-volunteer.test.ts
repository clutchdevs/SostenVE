import { beforeAll, describe, expect, it } from 'vitest';
import { getConfig } from '../../../src/config';
import { loginVolunteer } from '../../../src/application/volunteer/login-volunteer';
import { hashPassword } from '../../../src/shared/security/password';
import type { Volunteer, VolunteerRepository, VolunteerStatus } from '../../../src/domain/volunteer/volunteer';

const PASSWORD = 'a-strong-password';
let passwordHash = '';

function repoWith(status: VolunteerStatus): VolunteerRepository {
  const volunteer: Volunteer = {
    id: 'vol-1',
    fullName: 'Ana',
    professionalId: 'V-123',
    email: 'ana@example.com',
    role: 'psychologist',
    tokenVersion: 1,
    status,
    createdAt: new Date(),
  };
  return {
    async create() {
      return volunteer;
    },
    async findById() {
      return volunteer;
    },
    async findByProfessionalId() {
      return volunteer;
    },
    async findByEmail(email: string) {
      return email === volunteer.email ? volunteer : null;
    },
    async listByStatus() {
      return [volunteer];
    },
    async getPasswordHash() {
      return passwordHash;
    },
    async setStatus() {},
    async bumpTokenVersion() {
      return 2;
    },
  };
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-value-at-least-32-bytes-long!!';
  passwordHash = await hashPassword(PASSWORD);
});

describe('loginVolunteer', () => {
  it('returns tokens for valid active credentials', async () => {
    const result = await loginVolunteer(
      { email: 'ana@example.com', password: PASSWORD },
      { volunteers: repoWith('active'), config: getConfig() },
    );
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.role).toBe('psychologist');
  });

  it('rejects a wrong password', async () => {
    await expect(
      loginVolunteer(
        { email: 'ana@example.com', password: 'wrong' },
        { volunteers: repoWith('active'), config: getConfig() },
      ),
    ).rejects.toThrow();
  });

  it('rejects a non-active account', async () => {
    await expect(
      loginVolunteer(
        { email: 'ana@example.com', password: PASSWORD },
        { volunteers: repoWith('pending_approval'), config: getConfig() },
      ),
    ).rejects.toThrow();
  });

  it('rejects an unknown email', async () => {
    await expect(
      loginVolunteer(
        { email: 'nobody@example.com', password: PASSWORD },
        { volunteers: repoWith('active'), config: getConfig() },
      ),
    ).rejects.toThrow();
  });
});
