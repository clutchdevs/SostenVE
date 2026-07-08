import { ApiError, ForbiddenError } from '../../shared/errors/api-error.js';
import type { AssignmentRepository } from '../../domain/assignment/assignment.js';
import type { CaseRepository } from '../../domain/case/case.js';

export interface AcceptCaseDeps {
  cases: CaseRepository;
  assignments: AssignmentRepository;
}

/**
 * A volunteer accepts a case assigned to them, which stops the SLA escalation
 * (the case moves to `aceptado`). Fails if the case is not theirs, or if it is
 * not in the `asignado` state (already accepted, closed or still queued) — so a
 * case can only be accepted once.
 */
export async function acceptCase(
  caseId: string,
  volunteerId: string,
  deps: AcceptCaseDeps,
): Promise<void> {
  const caseRecord = await deps.cases.findById(caseId);
  if (!caseRecord) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  const assignments = await deps.assignments.findByCaseId(caseId);
  const own = assignments.find((assignment) => assignment.volunteerId === volunteerId);
  if (!own) {
    throw new ForbiddenError('Case is not assigned to this volunteer');
  }

  if (caseRecord.status !== 'ASSIGNED') {
    throw new ApiError(409, 'INVALID_STATE', 'Case cannot be accepted in its current state');
  }

  await deps.assignments.markAccepted(own.id, new Date());
  await deps.cases.updateStatus(caseId, 'ACCEPTED');
}
