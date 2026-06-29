import { hashPassword } from '../../shared/security/password';
import type { AuditLogRepository } from '../../domain/audit/audit';
import type { Volunteer, VolunteerRepository, VolunteerStatus } from '../../domain/volunteer/volunteer';
import type { FpvVerifier, Notifier } from './ports';

export interface RegisterVolunteerInput {
  fullName: string;
  professionalId: string;
  email: string;
  password: string;
  specialty?: string;
  availability?: string;
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
    return result.valid ? 'active' : 'pending_approval';
  } catch {
    return 'pending_approval';
  }
}

export async function registerVolunteer(
  input: RegisterVolunteerInput,
  deps: RegisterVolunteerDeps,
): Promise<RegisterVolunteerResult> {
  const status = await resolveStatus(input, deps);
  const passwordHash = await hashPassword(input.password);

  const volunteer: Volunteer = await deps.volunteers.create({
    fullName: input.fullName,
    professionalId: input.professionalId,
    email: input.email,
    specialty: input.specialty,
    availability: input.availability,
    role: 'psychologist',
    passwordHash,
    status,
  });

  const notification = { email: input.email, fullName: input.fullName };
  if (status === 'active') {
    await deps.notifier.notifyRegistrationApproved(notification);
  } else {
    await deps.notifier.notifyRegistrationPending(notification);
  }

  await deps.audit.append({
    userId: volunteer.id,
    role: volunteer.role,
    affectedRecordId: volunteer.id,
    actionType: `volunteer_registered:${status}`,
  });

  return { volunteerId: volunteer.id, status };
}
