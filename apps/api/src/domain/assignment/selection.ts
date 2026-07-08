import type { Volunteer } from '../volunteer/volunteer';

/**
 * Pure volunteer selection for a case. Two concerns, in order:
 *
 * 1. **Load balancing (RF-2.5):** a psychologist already holding `maxCaseload`
 *    active cases is skipped so cases spread out instead of piling on one, and the
 *    **least-loaded** eligible volunteer is chosen. A **high-risk** case bypasses
 *    the cap — a crisis is never left unassigned, so it goes to the least-loaded
 *    even if everyone is full.
 * 2. **Clinical fit (RF-1.3):** a child specialist is preferred when the case needs
 *    one — from "Infancia" tags (`requiresChildSpecialty`) or a minor requester
 *    (`age < 18`). It is soft: a case is never stranded when no specialist is free.
 *
 * Returns `null` when there are no candidates, or when every candidate is at the
 * cap and the case is not high-risk (it stays queued for the SLA sweep).
 *
 * Regional-cluster routing (RF-3.1) was **removed** after the FPV eliminated that
 * requirement (2026-07-03): assignment is by load + risk + specialty + presence.
 */
export interface CaseAssignmentInfo {
  age?: number;
  /** Case carries childhood tags → prefer a child specialist (RF-1.3). */
  requiresChildSpecialty?: boolean;
  /** High-risk cases bypass the caseload cap so a crisis is never left unassigned. */
  highRisk?: boolean;
}

/** Current per-volunteer active caseload and the cap used to balance (RF-2.5). */
export interface LoadContext {
  caseloadOf(volunteerId: string): number;
  maxCaseload: number;
}

const CHILD_SPECIALTY_KEYWORDS = ['infantil', 'niñ', 'nin', 'adolescen', 'child'];

function isChildSpecialist(volunteer: Volunteer): boolean {
  const specialty = volunteer.specialty?.toLowerCase() ?? '';
  return CHILD_SPECIALTY_KEYWORDS.some((keyword) => specialty.includes(keyword));
}

export function selectVolunteerForCase(
  candidates: readonly Volunteer[],
  caseInfo: CaseAssignmentInfo,
  load: LoadContext,
): Volunteer | null {
  if (candidates.length === 0) {
    return null;
  }

  // Capacity gate: drop volunteers already at the cap so a single person is not
  // saturated. High-risk bypasses it (never strand a crisis).
  const withCapacity = caseInfo.highRisk
    ? candidates
    : candidates.filter((v) => load.caseloadOf(v.id) < load.maxCaseload);
  if (withCapacity.length === 0) {
    return null; // everyone is full → the case stays queued for the SLA sweep
  }

  // Clinical fit: narrow to child specialists when needed and available.
  const needsChildSpecialist =
    caseInfo.requiresChildSpecialty === true ||
    (caseInfo.age !== undefined && caseInfo.age < 18);
  let pool = withCapacity;
  if (needsChildSpecialist) {
    const specialists = withCapacity.filter(isChildSpecialist);
    if (specialists.length > 0) pool = specialists;
  }

  // Balance: the least-loaded eligible volunteer (ties keep input/FIFO order).
  return pool.reduce(
    (best, v) => (load.caseloadOf(v.id) < load.caseloadOf(best.id) ? v : best),
    pool[0] as Volunteer,
  );
}
