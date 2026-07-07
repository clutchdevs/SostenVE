import { describe, expect, it } from 'vitest';
import { getConfig } from '../../../src/config';
import {
  requestPasswordReset,
  resetPassword,
} from '../../../src/application/volunteer/reset-password';
import { hashToken } from '../../../src/shared/security/invitation-token';
import type { AuditEntry, AuditLogRepository } from '../../../src/domain/audit/audit';
import type {
  NewPasswordResetToken,
  PasswordResetToken,
  PasswordResetTokenRepository,
} from '../../../src/domain/volunteer/password-reset';
import type { Notifier, PasswordResetNotification } from '../../../src/application/volunteer/ports';
import type { Volunteer, VolunteerRepository, VolunteerStatus } from '../../../src/domain/volunteer/volunteer';

function volunteer(status: VolunteerStatus): Volunteer {
  return {
    id: 'vol-1',
    fullName: 'Ana',
    professionalId: 'V-123',
    email: 'ana@example.com',
    role: 'psychologist',
    tokenVersion: 1,
    status,
    createdAt: new Date(),
  };
}

function volunteerRepo(v: Volunteer | null, sink: { updated: string | null; bumped: number }): VolunteerRepository {
  const self = v ?? volunteer('active');
  return {
    async create() {
      return self;
    },
    async findById() {
      return v;
    },
    async getDetailById() {
      return null;
    },
    async findByProfessionalId() {
      return v;
    },
    async findByEmail() {
      return v;
    },
    async listByStatus() {
      return v ? [v] : [];
    },
    async listAll() {
      return v ? [v] : [];
    },
    async getPasswordHash() {
      return 'hash';
    },
    async updatePasswordHash(_id, passwordHash) {
      sink.updated = passwordHash;
    },
    async setStatus() {},
    async getTokenVersion() {
      return 1;
    },
    async bumpTokenVersion() {
      sink.bumped += 1;
      return 2;
    },
  };
}

function tokenRepo(seed?: PasswordResetToken): {
  repo: PasswordResetTokenRepository;
  created: NewPasswordResetToken[];
  usedIds: string[];
} {
  const created: NewPasswordResetToken[] = [];
  const usedIds: string[] = [];
  const repo: PasswordResetTokenRepository = {
    async create(input) {
      created.push(input);
      return {
        id: 'tok-1',
        volunteerId: input.volunteerId,
        expiresAt: input.expiresAt,
        createdAt: new Date(),
      };
    },
    async findByTokenHash(hash) {
      return seed && hashToken('the-raw-token') === hash ? seed : null;
    },
    async markUsed(id) {
      usedIds.push(id);
    },
  };
  return { repo, created, usedIds };
}

function recordingNotifier(): Notifier & { resets: PasswordResetNotification[] } {
  const resets: PasswordResetNotification[] = [];
  return {
    async notifyRegistrationApproved() {},
    async notifyRegistrationPending() {},
    async notifyCoordinatorInvitation() {},
    async notifyPasswordReset(n) {
      resets.push(n);
    },
    resets,
  };
}

const audit = (entries: AuditEntry[]): AuditLogRepository => ({
  async append(entry) {
    entries.push(entry);
  },
});

describe('requestPasswordReset', () => {
  it('issues a token and emails an active volunteer', async () => {
    const sink = { updated: null, bumped: 0 };
    const tokens = tokenRepo();
    const notifier = recordingNotifier();
    const entries: AuditEntry[] = [];
    await requestPasswordReset(
      { email: 'ana@example.com' },
      {
        volunteers: volunteerRepo(volunteer('active'), sink),
        resetTokens: tokens.repo,
        notifier,
        audit: audit(entries),
        config: getConfig(),
      },
    );
    expect(tokens.created).toHaveLength(1);
    expect(notifier.resets).toHaveLength(1);
    expect(notifier.resets[0]?.resetUrl).toContain('?token=');
    expect(entries.map((e) => e.actionType)).toContain('password_reset_requested');
  });

  it('is a silent no-op for an unknown email (no enumeration)', async () => {
    const sink = { updated: null, bumped: 0 };
    const tokens = tokenRepo();
    const notifier = recordingNotifier();
    const entries: AuditEntry[] = [];
    await requestPasswordReset(
      { email: 'nobody@example.com' },
      {
        volunteers: volunteerRepo(null, sink),
        resetTokens: tokens.repo,
        notifier,
        audit: audit(entries),
        config: getConfig(),
      },
    );
    expect(tokens.created).toHaveLength(0);
    expect(notifier.resets).toHaveLength(0);
    expect(entries).toHaveLength(0);
  });

  it('does not issue a token for a non-active account', async () => {
    const sink = { updated: null, bumped: 0 };
    const tokens = tokenRepo();
    const notifier = recordingNotifier();
    await requestPasswordReset(
      { email: 'ana@example.com' },
      {
        volunteers: volunteerRepo(volunteer('pending_approval'), sink),
        resetTokens: tokens.repo,
        notifier,
        audit: audit([]),
        config: getConfig(),
      },
    );
    expect(tokens.created).toHaveLength(0);
    expect(notifier.resets).toHaveLength(0);
  });
});

describe('resetPassword', () => {
  const redeemable: PasswordResetToken = {
    id: 'tok-1',
    volunteerId: 'vol-1',
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
  };

  it('sets the password, consumes the token and bumps token_version', async () => {
    const sink = { updated: null as string | null, bumped: 0 };
    const tokens = tokenRepo(redeemable);
    const entries: AuditEntry[] = [];
    await resetPassword(
      { token: 'the-raw-token', newPassword: 'a-new-strong-password' },
      { volunteers: volunteerRepo(volunteer('active'), sink), resetTokens: tokens.repo, audit: audit(entries) },
    );
    expect(sink.updated).not.toBeNull();
    expect(sink.bumped).toBe(1);
    expect(tokens.usedIds).toEqual(['tok-1']);
    expect(entries.map((e) => e.actionType)).toContain('password_reset');
  });

  it('rejects an unknown token', async () => {
    const sink = { updated: null as string | null, bumped: 0 };
    const tokens = tokenRepo(redeemable);
    await expect(
      resetPassword(
        { token: 'wrong-token', newPassword: 'a-new-strong-password' },
        { volunteers: volunteerRepo(volunteer('active'), sink), resetTokens: tokens.repo, audit: audit([]) },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(sink.updated).toBeNull();
  });

  it('rejects an expired token', async () => {
    const expired: PasswordResetToken = { ...redeemable, expiresAt: new Date(Date.now() - 1_000) };
    const sink = { updated: null as string | null, bumped: 0 };
    const tokens = tokenRepo(expired);
    await expect(
      resetPassword(
        { token: 'the-raw-token', newPassword: 'a-new-strong-password' },
        { volunteers: volunteerRepo(volunteer('active'), sink), resetTokens: tokens.repo, audit: audit([]) },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(sink.updated).toBeNull();
  });

  it('rejects an already-used token', async () => {
    const used: PasswordResetToken = { ...redeemable, usedAt: new Date() };
    const sink = { updated: null as string | null, bumped: 0 };
    const tokens = tokenRepo(used);
    await expect(
      resetPassword(
        { token: 'the-raw-token', newPassword: 'a-new-strong-password' },
        { volunteers: volunteerRepo(volunteer('active'), sink), resetTokens: tokens.repo, audit: audit([]) },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(sink.updated).toBeNull();
  });
});
