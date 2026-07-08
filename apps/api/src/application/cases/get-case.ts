import { ApiError, ForbiddenError } from '../../shared/errors/api-error.js';
import type { CaseContact, CaseRecord } from '../../domain/case/case.js';
import type { ClinicalNote } from '../../domain/clinical/clinical-note.js';
import type { CaseClosure } from '../../domain/clinical/case-closure.js';
import type { CaseDeps } from './ports.js';

export interface CaseDetail {
  case: CaseRecord;
  contact: CaseContact | null;
  notes: ClinicalNote[];
  closure: CaseClosure | null;
}

async function assertOwnership(
  caseId: string,
  volunteerId: string,
  deps: Pick<CaseDeps, 'assignments'>,
): Promise<void> {
  const assignments = await deps.assignments.findByCaseId(caseId);
  if (!assignments.some((a) => a.volunteerId === volunteerId)) {
    throw new ForbiddenError('Case is not assigned to this volunteer');
  }
}

/**
 * Full case detail for the assigned psychologist: operational data + the
 * requester's contact PII (allowed for the assigned psychologist, PRD §2.1),
 * clinical notes and the closure record if any.
 */
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

  const [contact, notes, closure] = await Promise.all([
    deps.contacts.findByPseudonymId(caseRecord.pseudonymId),
    deps.notes.listByCaseId(caseId),
    deps.closures.findByCaseId(caseId),
  ]);

  return { case: caseRecord, contact, notes, closure };
}

export { assertOwnership };
