import { logger } from '../../shared/logger.js';
import { raiseAlert } from '../../shared/alerts.js';
import type { AssignmentDeps } from './ports.js';

/**
 * Escalates high-risk cases that were assigned but not accepted within the SLA
 * (RF-3.3): revoke the assignment, return the case to the top of the queue
 * (`pendiente`) and notify the coordinators. The next assignment pass can then
 * reassign it. This is the life-safety net: it does not depend on a human
 * reviewing the platform in time. (The FPV eliminated the geographic "coordinator
 * cluster" on 2026-07-03: escalation notifies all coordinators.)
 *
 * Observability (fase 06): if a high-risk case escalates and there is **no
 * coordinator online** to catch it, raise a critical alert. "Available" now means
 * a coordinator whose real-time presence is Online (RF-2.5), not merely one whose
 * account is active — a coordinator with the app closed can't act on the alert.
 */
export async function escalateOverdueCases(
  deps: AssignmentDeps,
  now: Date = new Date(),
): Promise<number> {
  const overdue = await deps.cases.listOverdueHighRiskAssigned(now);
  if (overdue.length === 0) {
    return 0;
  }

  const activeCoordinatorIds = (await deps.volunteers.listByStatus('active'))
    .filter((v) => v.roles.includes('coordinator'))
    .map((v) => v.id);
  const onlineCoordinators = await deps.presence.filterOnline(activeCoordinatorIds);
  const coordinatorAvailable = onlineCoordinators.size > 0;

  for (const caseRecord of overdue) {
    await deps.assignments.deleteByCaseId(caseRecord.id);
    await deps.cases.updateStatus(caseRecord.id, 'PENDING');
    await deps.notifier.notifyEscalated({ caseId: caseRecord.id });
    logger.warn('high-risk case escalated: SLA expired without acceptance', {
      caseId: caseRecord.id,
    });
    if (!coordinatorAvailable) {
      raiseAlert('high_risk_escalated_no_coordinator', { caseId: caseRecord.id });
    }
  }
  return overdue.length;
}
