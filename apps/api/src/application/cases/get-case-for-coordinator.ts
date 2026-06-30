import { ApiError } from '../../shared/errors/api-error';
import type { CaseDetail } from './get-case';
import type { CaseDeps } from './ports';

export interface CoordinatorActor {
  id: string;
  role: string;
}

/**
 * Case detail for a coordinator/admin (issue #25, HITL FPV decision): operational
 * data, clinical notes and the closure record. The requester's contact PII stays
 * restricted to the assigned psychologist, so `contact` is always null here.
 *
 * Per the audited-access policy, every coordinator/admin read of the clinical
 * content is recorded in the immutable audit log.
 */
export async function getCaseForCoordinator(
  caseId: string,
  actor: CoordinatorActor,
  deps: CaseDeps,
): Promise<CaseDetail> {
  const caseRecord = await deps.cases.findById(caseId);
  if (!caseRecord) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  const [notes, closure] = await Promise.all([
    deps.notes.listByCaseId(caseId),
    deps.closures.findByCaseId(caseId),
  ]);

  await deps.audit.append({
    userId: actor.id,
    role: actor.role,
    affectedRecordId: caseId,
    actionType: 'clinical_note_read',
  });

  return { case: caseRecord, contact: null, notes, closure };
}
