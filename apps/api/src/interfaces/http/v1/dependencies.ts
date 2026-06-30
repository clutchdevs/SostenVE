import { getConfig } from '../../../config';
import { forService } from '../../../infrastructure/supabase/client-factory';
import { SupabaseCaseContactRepository, SupabaseCaseRepository } from '../../../infrastructure/repositories/supabase-case-repository';
import { SupabaseIdempotencyStore } from '../../../infrastructure/repositories/supabase-idempotency-store';
import { SupabaseVolunteerRepository } from '../../../infrastructure/repositories/supabase-volunteer-repository';
import { SupabaseAssignmentRepository } from '../../../infrastructure/repositories/supabase-assignment-repository';
import { SupabaseAuditLogRepository } from '../../../infrastructure/repositories/supabase-audit-log-repository';
import { SupabaseClinicalNoteRepository } from '../../../infrastructure/repositories/supabase-clinical-note-repository';
import { SupabaseCaseClosureRepository } from '../../../infrastructure/repositories/supabase-case-closure-repository';
import { createFpvVerifier } from '../../../infrastructure/fpv';
import { createNotifier } from '../../../infrastructure/notifications';
import { LogAssignmentNotifier } from '../../../infrastructure/notifications/log-assignment-notifier';
import type { AssignmentDeps } from '../../../application/assignment/ports';
import type { CaseDeps } from '../../../application/cases/ports';
import type { IdempotencyStore } from '../../../application/intake/idempotency';
import type { IntakeDeps } from '../../../application/intake/types';
import type { RegisterVolunteerDeps } from '../../../application/volunteer/register-volunteer';
import type { LoginDeps } from '../../../application/volunteer/login-volunteer';
import type { ManageVolunteerDeps } from '../../../application/volunteer/manage-volunteer';
import type { VolunteerRepository } from '../../../domain/volunteer/volunteer';

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
    };
  }
  return assignmentCached;
}

let caseCached: CaseDeps | null = null;

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
