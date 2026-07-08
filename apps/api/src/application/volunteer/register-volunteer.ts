import { generatePassword, hashPassword } from '../../shared/security/password';
import { logger } from '../../shared/logger';
import { ApiError } from '../../shared/errors/api-error';
import type { AuditLogRepository } from '../../domain/audit/audit';
import type {
  PendingReason,
  Volunteer,
  VolunteerApplication,
  VolunteerRepository,
  VolunteerStatus,
} from '../../domain/volunteer/volunteer';
import type { FpvVerifier, Notifier } from './ports';

export interface RegisterVolunteerInput {
  fullName: string;
  professionalId: string;
  email: string;
  /** Contact phone (RF-2.1.2) — required so the coordinator can reach the volunteer. */
  phone: string;
  specialty?: string;
  /** Full applicant profile collected by the complete form (RF-2.1.2). */
  application: VolunteerApplication;
  /** Version of the informed-consent text the volunteer accepted (RF-2.1.1). */
  consentVersion: string;
}

export interface RegisterVolunteerDeps {
  volunteers: VolunteerRepository;
  fpvVerifier: FpvVerifier;
  notifier: Notifier;
  audit: AuditLogRepository;
}

export interface RegisterVolunteerResult {
  volunteerId: string;
  status: VolunteerStatus;
}

/**
 * Volunteer registration (Chain of Responsibility): resolve the FPV verification
 * to a status, persist, then notify + audit.
 *
 * Automatic activation rule (RF-2.2): a volunteer is activated only when the FPV
 * registry verifies AND the applicant declared PAP training (`cédula+FPV ∧ PAP=Sí
 * → Activo`); otherwise it goes to `pending_approval` for an admin to review.
 *
 * Resilience: if the verifier throws (external service down or circuit breaker
 * open) the registration is NOT blocked — it falls back to `pending_approval`
 * (exception case, RF-2.2) so an external outage never stops sign-ups.
 */
interface ResolvedStatus {
  status: VolunteerStatus;
  /** Why it went to manual review (only when status is `pending_approval`). */
  reason?: PendingReason;
}

async function resolveStatus(
  input: RegisterVolunteerInput,
  deps: RegisterVolunteerDeps,
): Promise<ResolvedStatus> {
  let result;
  try {
    result = await deps.fpvVerifier.verify({
      professionalId: input.professionalId,
      nationalId: input.application.documentNumber,
      fullName: input.fullName,
    });
  } catch {
    // External verifier down / circuit breaker open / token missing: a transient
    // failure must never block a legitimate sign-up → manual review (RF-2.2).
    return { status: 'pending_approval', reason: 'fpv_unreachable' };
  }

  if (!result.valid) {
    // The padrón gave a definitive answer. "Not found" means the applicant is not
    // an FPV member, so the request is rejected outright (no account is created).
    // A found-but-inactive licence (`fpv_status_*`) does exist, so it is routed to
    // manual review instead of being rejected.
    const notInRegistry = result.reason === undefined || result.reason === 'fpv_not_found';
    if (notInRegistry) {
      throw new ApiError(
        422,
        'FPV_NOT_REGISTERED',
        'No figuras en el padrón de la Federación de Psicólogos de Venezuela. Verifica tu número de cédula y de inscripción FPV.',
      );
    }
    return { status: 'pending_approval', reason: 'fpv_not_found' };
  }

  if (!input.application.papTrained) return { status: 'pending_approval', reason: 'pap_not_declared' };
  return { status: 'active' };
}

export async function registerVolunteer(
  input: RegisterVolunteerInput,
  deps: RegisterVolunteerDeps,
): Promise<RegisterVolunteerResult> {
  const { status, reason } = await resolveStatus(input, deps);
  // High-entropy password generated server-side (RF-2.2.4); the user never picks
  // it. Delivered to an active volunteer via the welcome email — never returned
  // in the HTTP response, never logged.
  const temporaryPassword = generatePassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const consentAcceptedAt = new Date();

  const volunteer: Volunteer = await deps.volunteers.create({
    fullName: input.fullName,
    professionalId: input.professionalId,
    email: input.email,
    phone: input.phone,
    specialty: input.specialty,
    role: 'psychologist',
    passwordHash,
    status,
    pendingReason: reason,
    application: input.application,
    consentVersion: input.consentVersion,
    consentAcceptedAt,
  });

  // The account is already created; a failed notification email must NOT fail the
  // registration (the volunteer would otherwise see an error for a successful
  // sign-up). Log and continue — an admin can re-send credentials on approval.
  try {
    if (status === 'active') {
      await deps.notifier.notifyRegistrationApproved({
        email: input.email,
        fullName: input.fullName,
        temporaryPassword,
      });
    } else {
      await deps.notifier.notifyRegistrationPending({ email: input.email, fullName: input.fullName });
    }
  } catch {
    logger.warn('registration notification email failed (registration kept)', {
      volunteerId: volunteer.id,
      status,
    });
  }

  await deps.audit.append({
    userId: volunteer.id,
    role: volunteer.role,
    affectedRecordId: volunteer.id,
    actionType: `volunteer_registered:${status}`,
  });

  // Auditable informed-consent record (RF-2.1.1): the version is in the action
  // type and the timestamp is the audit row's immutable created_at.
  await deps.audit.append({
    userId: volunteer.id,
    role: volunteer.role,
    affectedRecordId: volunteer.id,
    actionType: `consent_accepted:${input.consentVersion}`,
  });

  return { volunteerId: volunteer.id, status };
}
