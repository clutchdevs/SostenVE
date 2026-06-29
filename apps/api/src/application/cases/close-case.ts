import type { CaseStatus } from '../../domain/case/case';
import { assertOwnership } from './get-case';
import type { CaseDeps } from './ports';

/**
 * Updates the status of a case owned by the volunteer (e.g. move to follow-up or
 * close it). Ownership is enforced.
 */
export async function updateCaseStatus(
  caseId: string,
  volunteerId: string,
  status: CaseStatus,
  deps: CaseDeps,
): Promise<void> {
  await assertOwnership(caseId, volunteerId, deps);
  await deps.cases.updateStatus(caseId, status);
  await deps.audit.append({
    userId: volunteerId,
    role: 'psychologist',
    affectedRecordId: caseId,
    actionType: `case_status_changed:${status}`,
  });
}
