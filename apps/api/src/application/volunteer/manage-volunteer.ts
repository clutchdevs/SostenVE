import { ApiError } from '../../shared/errors/api-error';
import type { AuditLogRepository } from '../../domain/audit/audit';
import type { Volunteer, VolunteerRepository } from '../../domain/volunteer/volunteer';

export interface ManageVolunteerDeps {
  volunteers: VolunteerRepository;
  audit: AuditLogRepository;
}

async function requireVolunteer(
  deps: ManageVolunteerDeps,
  volunteerId: string,
): Promise<Volunteer> {
  const volunteer = await deps.volunteers.findById(volunteerId);
  if (!volunteer) {
    throw new ApiError(404, 'NOT_FOUND', 'Volunteer not found');
  }
  return volunteer;
}

/** Admin resolves an exception case: approve a pending volunteer. */
export async function approveVolunteer(
  volunteerId: string,
  adminId: string,
  deps: ManageVolunteerDeps,
): Promise<void> {
  const volunteer = await requireVolunteer(deps, volunteerId);
  await deps.volunteers.setStatus(volunteer.id, 'active');
  await deps.audit.append({
    userId: adminId,
    role: 'admin',
    affectedRecordId: volunteer.id,
    actionType: 'volunteer_approved',
  });
}

/**
 * Admin deactivates/rejects a volunteer. Bumps the token version so any active
 * sessions are invalidated immediately (ADR-0005).
 */
export async function rejectVolunteer(
  volunteerId: string,
  adminId: string,
  deps: ManageVolunteerDeps,
): Promise<void> {
  const volunteer = await requireVolunteer(deps, volunteerId);
  await deps.volunteers.setStatus(volunteer.id, 'inactive');
  await deps.volunteers.bumpTokenVersion(volunteer.id);
  await deps.audit.append({
    userId: adminId,
    role: 'admin',
    affectedRecordId: volunteer.id,
    actionType: 'volunteer_rejected',
  });
}
