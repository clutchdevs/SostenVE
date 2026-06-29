import { logger } from '../../shared/logger';
import type { AssignmentDeps } from './ports';

/**
 * Escalates high-risk cases that were assigned but not accepted within the SLA
 * (RF-3.3): revoke the assignment, return the case to the top of the queue
 * (`pendiente`) and notify the coordinator cluster. The next assignment pass can
 * then reassign it. This is the life-safety net: it does not depend on a human
 * reviewing the platform in time.
 */
export async function escalateOverdueCases(
  deps: AssignmentDeps,
  now: Date = new Date(),
): Promise<number> {
  const overdue = await deps.cases.listOverdueHighRiskAssigned(now);
  for (const caseRecord of overdue) {
    await deps.assignments.deleteByCaseId(caseRecord.id);
    await deps.cases.updateStatus(caseRecord.id, 'PENDING');
    await deps.notifier.notifyEscalated({ caseId: caseRecord.id });
    logger.warn('high-risk case escalated: SLA expired without acceptance', {
      caseId: caseRecord.id,
    });
  }
  return overdue.length;
}
