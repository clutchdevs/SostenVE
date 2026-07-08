import { assignPendingCases } from './assign-cases.js';
import { escalateOverdueCases } from './escalate-sla.js';
import type { AssignmentDeps } from './ports.js';

export interface ProcessQueueResult {
  escalated: number;
  assigned: number;
}

/**
 * Cron orchestration (Observer-style): first escalate overdue high-risk cases
 * back to the queue, then assign pending cases — so just-escalated cases can be
 * reassigned in the same run. Its DB queries also keep the free-tier Supabase
 * project from pausing (ADR-0002).
 */
export async function processQueue(
  deps: AssignmentDeps,
  now: Date = new Date(),
): Promise<ProcessQueueResult> {
  const escalated = await escalateOverdueCases(deps, now);
  const assigned = await assignPendingCases(deps);
  return { escalated, assigned };
}
