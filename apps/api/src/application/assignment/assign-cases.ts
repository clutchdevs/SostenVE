import { selectVolunteerForCase } from '../../domain/assignment/selection';
import type { Volunteer } from '../../domain/volunteer/volunteer';
import type { AssignmentDeps } from './ports';

/**
 * Assigns pending cases to compatible active volunteers. A case with no available
 * volunteer stays in the queue (`pendiente`) honestly. Within a single run each
 * volunteer is given at most one new case (basic distribution); richer load
 * balancing is future work.
 */
export async function assignPendingCases(deps: AssignmentDeps): Promise<number> {
  const pending = await deps.cases.listByStatus('PENDING');
  if (pending.length === 0) {
    return 0;
  }

  const available: Volunteer[] = await deps.volunteers.listByStatus('active');
  let assigned = 0;

  for (const caseRecord of pending) {
    const volunteer = selectVolunteerForCase(available, { age: caseRecord.age });
    if (!volunteer) {
      continue; // no volunteer available -> remains in queue
    }
    await deps.assignments.create({ caseId: caseRecord.id, volunteerId: volunteer.id });
    await deps.cases.updateStatus(caseRecord.id, 'ASSIGNED');
    await deps.notifier.notifyAssigned({ volunteerId: volunteer.id, caseId: caseRecord.id });

    available.splice(available.indexOf(volunteer), 1);
    assigned += 1;
    if (available.length === 0) {
      break;
    }
  }

  return assigned;
}
