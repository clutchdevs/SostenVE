import { generatePassword, hashPassword } from '../../shared/security/password';
import type { AuditLogRepository } from '../../domain/audit/audit';
import type {
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
async function resolveStatus(
  input: RegisterVolunteerInput,
  deps: RegisterVolunteerDeps,
): Promise<VolunteerStatus> {
  try {
    const result = await deps.fpvVerifier.verify({
      professionalId: input.professionalId,
      fullName: input.fullName,
    });
    return result.valid && input.application.papTrained ? 'active' : 'pending_approval';
  } catch {
    return 'pending_approval';
  }
}

export async function registerVolunteer(
  input: RegisterVolunteerInput,
  deps: RegisterVolunteerDeps,
): Promise<RegisterVolunteerResult> {
  const status = await resolveStatus(input, deps);
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
    specialty: input.specialty,
    role: 'psychologist',
    passwordHash,
    status,
    application: input.application,
    consentVersion: input.consentVersion,
    consentAcceptedAt,
  });

  if (status === 'active') {
    await deps.notifier.notifyRegistrationApproved({
      email: input.email,
      fullName: input.fullName,
      temporaryPassword,
    });
  } else {
    await deps.notifier.notifyRegistrationPending({ email: input.email, fullName: input.fullName });
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
