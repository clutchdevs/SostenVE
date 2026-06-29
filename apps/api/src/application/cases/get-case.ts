import { ApiError, ForbiddenError } from '../../shared/errors/api-error';
import type { CaseRecord } from '../../domain/case/case';
import type { ClinicalNote } from '../../domain/clinical/clinical-note';
import type { CaseDeps } from './ports';

export interface CaseDetail {
  case: CaseRecord;
  notes: ClinicalNote[];
}

async function assertOwnership(
  caseId: string,
  volunteerId: string,
  deps: CaseDeps,
): Promise<void> {
  const assignments = await deps.assignments.findByCaseId(caseId);
  if (!assignments.some((a) => a.volunteerId === volunteerId)) {
    throw new ForbiddenError('Case is not assigned to this volunteer');
  }
}

/** Case detail (with notes) for the assigned psychologist only. */
export async function getCaseForVolunteer(
  caseId: string,
  volunteerId: string,
  deps: CaseDeps,
): Promise<CaseDetail> {
  const caseRecord = await deps.cases.findById(caseId);
  if (!caseRecord) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }
  await assertOwnership(caseId, volunteerId, deps);
  const notes = await deps.notes.listByCaseId(caseId);
  return { case: caseRecord, notes };
}

export { assertOwnership };
