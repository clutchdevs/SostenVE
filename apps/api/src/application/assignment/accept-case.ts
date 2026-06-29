import { ForbiddenError } from '../../shared/errors/api-error';
import type { AssignmentRepository } from '../../domain/assignment/assignment';
import type { CaseRepository } from '../../domain/case/case';

export interface AcceptCaseDeps {
  cases: CaseRepository;
  assignments: AssignmentRepository;
}

/**
 * A volunteer accepts a case assigned to them, which stops the SLA escalation
 * (the case moves to `aceptado`). Fails if the case is not assigned to them.
 */
export async function acceptCase(
  caseId: string,
  volunteerId: string,
  deps: AcceptCaseDeps,
): Promise<void> {
  const assignments = await deps.assignments.findByCaseId(caseId);
  const own = assignments.find((assignment) => assignment.volunteerId === volunteerId);
  if (!own) {
    throw new ForbiddenError('Case is not assigned to this volunteer');
  }
  await deps.assignments.markAccepted(own.id, new Date());
  await deps.cases.updateStatus(caseId, 'ACCEPTED');
}
