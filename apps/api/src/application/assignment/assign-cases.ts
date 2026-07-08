import { selectVolunteerForCase } from '../../domain/assignment/selection.js';
import { RiskLevel } from '../../domain/triage/index.js';
import { logger } from '../../shared/logger.js';
import type { Volunteer } from '../../domain/volunteer/volunteer.js';
import type { AssignmentDeps } from './ports.js';

/**
 * Assigns pending cases to compatible active volunteers. A case with no available
 * volunteer stays in the queue (`pendiente`) honestly. Within a single run each
 * volunteer is given at most one new case (basic distribution); richer load
 * balancing is future work.
 *
 * Runs from several triggers (intake submit, a psychologist coming online, the
 * cron sweep), so each case is taken through an atomic `claimForAssignment` guard
 * that flips `pendiente → asignado` only if still pending. Losing the claim means
 * a concurrent trigger already took the case, so it is skipped — never assigned
 * twice.
 *
 * Load balancing (RF-2.5): the current active caseload of each online psychologist
 * is computed up front; a psychologist at the admin-configurable cap is skipped
 * for new (non-high-risk) cases, and the least-loaded eligible one is chosen. The
 * in-run counter is updated after each assignment so a single sweep spreads work
 * out instead of piling it on the first volunteer.
 */
export async function assignPendingCases(deps: AssignmentDeps): Promise<number> {
  const pending = await deps.cases.listByStatus('PENDING');
  if (pending.length === 0) {
    return 0;
  }

  // Drain the queue by the weighted urgency index (RF-1.5): higher urgency first,
  // ties broken by arrival (FIFO). Ideation cases carry a dominant term so they
  // are always served before any non-ideation case.
  pending.sort(
    (a, b) => b.urgencyScore - a.urgencyScore || a.createdAt.getTime() - b.createdAt.getTime(),
  );

  // Only psychologists receive cases — coordinators/admins are active staff but
  // are not part of the assignment pool.
  const activePsychologists: Volunteer[] = (await deps.volunteers.listByStatus('active')).filter(
    (v) => v.role === 'psychologist',
  );
  // Real-time presence gate (RF-2.5 / RF-3.1): only volunteers currently online
  // are eligible, so a critical case is never assigned to someone absent. If none
  // are online the cases stay queued honestly and the SLA sweep escalates them.
  const onlineIds = await deps.presence.filterOnline(activePsychologists.map((v) => v.id));
  const available: Volunteer[] = activePsychologists.filter((v) => onlineIds.has(v.id));
  let assigned = 0;

  // Current active caseload per volunteer (cases not yet closed): the balancing
  // baseline. Updated in memory as we assign so one sweep spreads work out.
  const caseload = await activeCaseloadByVolunteer(deps);
  const { maxActiveCaseload } = await deps.settings.get();
  const load = {
    caseloadOf: (id: string) => caseload.get(id) ?? 0,
    maxCaseload: maxActiveCaseload,
  };

  for (const caseRecord of pending) {
    const volunteer = selectVolunteerForCase(
      available,
      {
        age: caseRecord.age,
        requiresChildSpecialty: caseRecord.requiresChildSpecialty,
        highRisk: caseRecord.riskLevel === RiskLevel.HIGH,
      },
      load,
    );
    if (!volunteer) {
      continue; // no volunteer with capacity -> remains in queue
    }

    // Atomically claim the case before doing anything else. If another trigger
    // already took it, skip — the volunteer stays free for the next case.
    const claimed = await deps.cases.claimForAssignment(caseRecord.id);
    if (!claimed) {
      continue;
    }

    try {
      await deps.assignments.create({ caseId: caseRecord.id, volunteerId: volunteer.id });
    } catch (error) {
      // Return the case to the queue so it is retried instead of being stranded
      // as `asignado` with no assignment row.
      await deps.cases.updateStatus(caseRecord.id, 'PENDING');
      logger.warn('assignment write failed after claim; returned case to queue', {
        caseId: caseRecord.id,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    // Best-effort notification: the case is already assigned, so a failed notice
    // must not undo it (the SLA sweep / portal still surface the case).
    try {
      await deps.notifier.notifyAssigned({ volunteerId: volunteer.id, caseId: caseRecord.id });
    } catch (error) {
      logger.warn('assignment notification failed (assignment kept)', {
        caseId: caseRecord.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Count this case against the volunteer's load so the next iteration balances
    // against it (and skips them once they reach the cap).
    caseload.set(volunteer.id, (caseload.get(volunteer.id) ?? 0) + 1);
    assigned += 1;
  }

  return assigned;
}

/**
 * Active caseload per volunteer = cases still open (assigned / accepted / in
 * follow-up; closed and re-queued cases do not count). One query set per sweep.
 */
async function activeCaseloadByVolunteer(deps: AssignmentDeps): Promise<Map<string, number>> {
  const activeCases = [
    ...(await deps.cases.listByStatus('ASSIGNED')),
    ...(await deps.cases.listByStatus('ACCEPTED')),
    ...(await deps.cases.listByStatus('IN_FOLLOW_UP')),
  ];
  const caseload = new Map<string, number>();
  if (activeCases.length === 0) return caseload;

  const assignments = await deps.assignments.findByCaseIds(activeCases.map((c) => c.id));
  for (const a of assignments) {
    caseload.set(a.volunteerId, (caseload.get(a.volunteerId) ?? 0) + 1);
  }
  return caseload;
}
