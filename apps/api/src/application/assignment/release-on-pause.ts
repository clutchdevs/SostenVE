import { logger } from '../../shared/logger.js';
import type { AssignmentDeps } from './ports.js';

/**
 * When a psychologist pauses (goes offline), any case still `ASSIGNED` to them
 * that they have NOT yet accepted is returned to the queue (`PENDING`) so the SLA
 * isn't spent waiting on someone who stepped away (issue #130). Accepted cases and
 * follow-ups are left untouched — the psychologist is actively handling those.
 *
 * The case status is the authoritative gate: `ASSIGNED` means assigned-but-not-yet
 * accepted, while acceptance moves it to `ACCEPTED`. Returns the number of cases
 * released; callers typically re-run assignment right after so an online
 * psychologist can pick each case up immediately.
 */
export async function releaseUnacceptedOnPause(
  volunteerId: string,
  deps: AssignmentDeps,
): Promise<number> {
  const assignments = await deps.assignments.findByVolunteerId(volunteerId);
  if (assignments.length === 0) return 0;

  let released = 0;
  for (const assignment of assignments) {
    const caseRecord = await deps.cases.findById(assignment.caseId);
    // Only an assigned-but-unaccepted case is returned to the queue; anything the
    // psychologist already accepted (or that is closed/pending) is left alone.
    if (!caseRecord || caseRecord.status !== 'ASSIGNED') continue;

    await deps.assignments.deleteByCaseId(caseRecord.id);
    await deps.cases.updateStatus(caseRecord.id, 'PENDING');
    released += 1;
    logger.info('case returned to queue: psychologist paused before accepting', {
      caseId: caseRecord.id,
      volunteerId,
    });
  }
  return released;
}
