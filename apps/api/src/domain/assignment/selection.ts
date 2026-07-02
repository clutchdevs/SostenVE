import type { Volunteer } from '../volunteer/volunteer';

/**
 * Pure volunteer selection for a case. A volunteer with a child specialty is
 * preferred when the case needs one — either because it carries "Infancia" tags
 * (RF-1.3, `requiresChildSpecialty`) or because the requester is a minor
 * (`age < 18`). Otherwise (or if no child specialist is available) any active
 * candidate is used. Returns `null` when there are no candidates. Load balancing
 * is intentionally simple (first match) for the MVP.
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
  const needsChildSpecialist =
    caseInfo.requiresChildSpecialty === true ||
    (caseInfo.age !== undefined && caseInfo.age < 18);
  if (needsChildSpecialist) {
    const childSpecialist = candidates.find(isChildSpecialist);
    if (childSpecialist) {
      return childSpecialist;
    }
  }
  return candidates[0] ?? null;
}
