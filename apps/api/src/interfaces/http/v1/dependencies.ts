import { getConfig } from '../../../config/index.js';
import { forService } from '../../../infrastructure/supabase/client-factory.js';
import { SupabaseCaseContactRepository, SupabaseCaseRepository } from '../../../infrastructure/repositories/supabase-case-repository.js';
import { SupabaseIdempotencyStore } from '../../../infrastructure/repositories/supabase-idempotency-store.js';
import { SupabaseVolunteerRepository } from '../../../infrastructure/repositories/supabase-volunteer-repository.js';
import { SupabaseVolunteerNoteRepository } from '../../../infrastructure/repositories/supabase-volunteer-note-repository.js';
import { SupabaseAssignmentRepository } from '../../../infrastructure/repositories/supabase-assignment-repository.js';
import { SupabaseAssignmentSettingsRepository } from '../../../infrastructure/repositories/supabase-assignment-settings-repository.js';
import { SupabaseAuditLogRepository } from '../../../infrastructure/repositories/supabase-audit-log-repository.js';
import { SupabaseClinicalNoteRepository } from '../../../infrastructure/repositories/supabase-clinical-note-repository.js';
import { SupabaseCaseClosureRepository } from '../../../infrastructure/repositories/supabase-case-closure-repository.js';
import { SupabaseClosedCaseReportRepository } from '../../../infrastructure/repositories/supabase-closed-case-report-repository.js';
import { SupabaseCrisisLineRepository } from '../../../infrastructure/repositories/supabase-crisis-line-repository.js';
import { SupabaseCoordinatorInvitationRepository } from '../../../infrastructure/repositories/supabase-coordinator-invitation-repository.js';
import { SupabasePasswordResetTokenRepository } from '../../../infrastructure/repositories/supabase-password-reset-token-repository.js';
import { createFpvVerifier } from '../../../infrastructure/fpv/index.js';
import { createNotifier } from '../../../infrastructure/notifications/index.js';
import { createPresenceStore } from '../../../infrastructure/presence/index.js';
import { LogAssignmentNotifier } from '../../../infrastructure/notifications/log-assignment-notifier.js';
import type { AssignmentDeps } from '../../../application/assignment/ports.js';
import type { PresenceStore } from '../../../application/presence/ports.js';
import type { CaseDeps } from '../../../application/cases/ports.js';
import type { ReportDeps } from '../../../application/reports/ports.js';
import type { CrisisLineDeps } from '../../../application/crisis-line/manage-crisis-lines.js';
import type { InvitationDeps } from '../../../application/coordinator/manage-invitations.js';
import type { AcceptInvitationDeps } from '../../../application/coordinator/accept-invitation.js';
import type { ChangePasswordDeps } from '../../../application/volunteer/change-password.js';
import type {
  RequestPasswordResetDeps,
  ResetPasswordDeps,
} from '../../../application/volunteer/reset-password.js';
import type { QueryAuditLogDeps } from '../../../application/audit/query-audit-log.js';
import type { CrisisLineRepository } from '../../../domain/crisis-line/crisis-line.js';
import type { IdempotencyStore } from '../../../application/intake/idempotency.js';
import type { IntakeDeps } from '../../../application/intake/types.js';
import type { RegisterVolunteerDeps } from '../../../application/volunteer/register-volunteer.js';
import type { LoginDeps } from '../../../application/volunteer/login-volunteer.js';
import type { ManageVolunteerDeps } from '../../../application/volunteer/manage-volunteer.js';
import type { VolunteerNotesDeps } from '../../../application/volunteer/manage-volunteer-notes.js';
import type { VolunteerRepository } from '../../../domain/volunteer/volunteer.js';

/**
 * Composition root for the intake feature. Builds use-case dependencies over the
 * service Supabase client (intake is anonymous, server-trusted). Lazy so build
 * and unit tests do not require secrets until an endpoint is actually hit.
 */
interface IntakeContainer {
  intakeDeps: IntakeDeps;
  idempotency: IdempotencyStore;
}

let cached: IntakeContainer | null = null;

export function getIntakeContainer(): IntakeContainer {
  if (cached === null) {
    const salt = process.env.PSEUDONYMIZATION_SALT;
    if (!salt) {
      throw new Error('Missing required environment variable: PSEUDONYMIZATION_SALT');
    }
    const client = forService();
    cached = {
      intakeDeps: {
        cases: new SupabaseCaseRepository(client),
        contacts: new SupabaseCaseContactRepository(client),
        config: getConfig(),
        pseudonymSalt: salt,
      },
      idempotency: new SupabaseIdempotencyStore(client),
    };
  }
  return cached;
}

interface VolunteerContainer {
  volunteers: VolunteerRepository;
  registerDeps: RegisterVolunteerDeps;
  loginDeps: LoginDeps;
  manageDeps: ManageVolunteerDeps;
  notesDeps: VolunteerNotesDeps;
}

let volunteerCached: VolunteerContainer | null = null;

export function getVolunteerContainer(): VolunteerContainer {
  if (volunteerCached === null) {
    const client = forService();
    const config = getConfig();
    const volunteers = new SupabaseVolunteerRepository(client);
    const audit = new SupabaseAuditLogRepository(client);
    const notifier = createNotifier(config);
    volunteerCached = {
      volunteers,
      registerDeps: {
        volunteers,
        fpvVerifier: createFpvVerifier(config),
        notifier,
        audit,
      },
      loginDeps: { volunteers, config },
      manageDeps: { volunteers, audit, notifier },
      notesDeps: { notes: new SupabaseVolunteerNoteRepository(client), volunteers, audit },
    };
  }
  return volunteerCached;
}

let assignmentCached: AssignmentDeps | null = null;

export function getAssignmentDeps(): AssignmentDeps {
  if (assignmentCached === null) {
    const client = forService();
    assignmentCached = {
      cases: new SupabaseCaseRepository(client),
      assignments: new SupabaseAssignmentRepository(client),
      volunteers: new SupabaseVolunteerRepository(client),
      notifier: new LogAssignmentNotifier(),
      presence: createPresenceStore(getConfig()),
      settings: new SupabaseAssignmentSettingsRepository(client),
      config: getConfig(),
    };
  }
  return assignmentCached;
}

let assignmentSettingsRepoCached: SupabaseAssignmentSettingsRepository | null = null;

/** Assignment settings repository for the admin GET/PUT caseload-cap endpoints. */
export function getAssignmentSettingsRepo(): SupabaseAssignmentSettingsRepository {
  if (assignmentSettingsRepoCached === null) {
    assignmentSettingsRepoCached = new SupabaseAssignmentSettingsRepository(forService());
  }
  return assignmentSettingsRepoCached;
}

/** Shared presence store for the heartbeat endpoint and coordinator visibility. */
export function getPresenceStore(): PresenceStore {
  return createPresenceStore(getConfig());
}

let crisisLineRepoCached: CrisisLineRepository | null = null;

/** Crisis-line repository for the public `/crisis-lines/active` route (DB-driven). */
export function getCrisisLineDeps(): CrisisLineRepository {
  if (crisisLineRepoCached === null) {
    crisisLineRepoCached = new SupabaseCrisisLineRepository(forService());
  }
  return crisisLineRepoCached;
}

interface AdminContainer {
  crisisLines: CrisisLineDeps;
  audit: QueryAuditLogDeps;
  invitations: InvitationDeps;
}

let adminCached: AdminContainer | null = null;

/** Composition root for the admin endpoints (crisis-line CRUD + audit query). */
export function getAdminContainer(): AdminContainer {
  if (adminCached === null) {
    const client = forService();
    const config = getConfig();
    const audit = new SupabaseAuditLogRepository(client);
    adminCached = {
      crisisLines: { lines: new SupabaseCrisisLineRepository(client), audit },
      audit: { reader: audit },
      invitations: {
        invitations: new SupabaseCoordinatorInvitationRepository(client),
        volunteers: new SupabaseVolunteerRepository(client),
        notifier: createNotifier(config),
        audit,
        config,
      },
    };
  }
  return adminCached;
}

let acceptInvitationCached: AcceptInvitationDeps | null = null;

/** Composition root for the public coordinator self-activation route (RF-2.6). */
export function getAcceptInvitationDeps(): AcceptInvitationDeps {
  if (acceptInvitationCached === null) {
    const client = forService();
    acceptInvitationCached = {
      invitations: new SupabaseCoordinatorInvitationRepository(client),
      volunteers: new SupabaseVolunteerRepository(client),
      audit: new SupabaseAuditLogRepository(client),
    };
  }
  return acceptInvitationCached;
}

interface PasswordFlowContainer {
  change: ChangePasswordDeps;
  requestReset: RequestPasswordResetDeps;
  reset: ResetPasswordDeps;
}

let passwordFlowCached: PasswordFlowContainer | null = null;

/** Composition root for the password change/reset flows (RF-2.2.4, issue #36). */
export function getPasswordFlowContainer(): PasswordFlowContainer {
  if (passwordFlowCached === null) {
    const client = forService();
    const config = getConfig();
    const volunteers = new SupabaseVolunteerRepository(client);
    const audit = new SupabaseAuditLogRepository(client);
    const resetTokens = new SupabasePasswordResetTokenRepository(client);
    const notifier = createNotifier(config);
    passwordFlowCached = {
      change: { volunteers, audit },
      requestReset: { volunteers, resetTokens, notifier, audit, config },
      reset: { volunteers, resetTokens, audit },
    };
  }
  return passwordFlowCached;
}

let caseCached: CaseDeps | null = null;

let reportCached: ReportDeps | null = null;

/** Closed-case report (issue #169). Read-only + audit; no PII repositories wired in. */
export function getReportDeps(): ReportDeps {
  if (reportCached === null) {
    const client = forService();
    reportCached = {
      reports: new SupabaseClosedCaseReportRepository(client),
      audit: new SupabaseAuditLogRepository(client),
    };
  }
  return reportCached;
}

export function getCaseDeps(): CaseDeps {
  if (caseCached === null) {
    const client = forService();
    caseCached = {
      cases: new SupabaseCaseRepository(client),
      contacts: new SupabaseCaseContactRepository(client),
      assignments: new SupabaseAssignmentRepository(client),
      notes: new SupabaseClinicalNoteRepository(client),
      closures: new SupabaseCaseClosureRepository(client),
      audit: new SupabaseAuditLogRepository(client),
      config: getConfig(),
    };
  }
  return caseCached;
}
