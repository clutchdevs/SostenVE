import type { Volunteer } from '../volunteer/volunteer';

/**
 * Pure volunteer selection for a case. The only preference is clinical fit — a
 * child specialist when the case needs one, either from "Infancia" tags (RF-1.3,
 * `requiresChildSpecialty`) or a minor requester (`age < 18`). It is soft, so a
 * case is never stranded when no specialist is available. Falls back to the
 * first candidate; returns `null` when there are none. Load balancing is
 * intentionally simple (first match) for the MVP.
 *
 * Regional-cluster routing (RF-3.1) was **removed** after the FPV eliminated that
 * requirement (2026-07-03): assignment is by risk + specialty + presence only.
 */
export interface CaseAssignmentInfo {
  age?: number;
  /** Case carries childhood tags → prefer a child specialist (RF-1.3). */
  requiresChildSpecialty?: boolean;
}

const CHILD_SPECIALTY_KEYWORDS = ['infantil', 'niñ', 'nin', 'adolescen', 'child'];

function isChildSpecialist(volunteer: Volunteer): boolean {
  const specialty = volunteer.specialty?.toLowerCase() ?? '';
  return CHILD_SPECIALTY_KEYWORDS.some((keyword) => specialty.includes(keyword));
}

export function selectVolunteerForCase(
  candidates: readonly Volunteer[],
  caseInfo: CaseAssignmentInfo,
): Volunteer | null {
  if (candidates.length === 0) {
    return null;
  }

  // Clinical fit: narrow to child specialists when needed and available.
  const needsChildSpecialist =
    caseInfo.requiresChildSpecialty === true ||
    (caseInfo.age !== undefined && caseInfo.age < 18);
  if (needsChildSpecialist) {
    const specialists = candidates.filter(isChildSpecialist);
    if (specialists.length > 0) return specialists[0] ?? null;
  }

  return candidates[0] ?? null;
}
