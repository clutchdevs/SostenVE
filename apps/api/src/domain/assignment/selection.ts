import type { Volunteer } from '../volunteer/volunteer';

/**
 * Pure volunteer selection for a case. If the requester is a minor (`age < 18`),
 * a volunteer with a child specialty is preferred; otherwise (or if none is
 * available) any active candidate is used. Returns `null` when there are no
 * candidates. Load balancing is intentionally simple (first match) for the MVP.
 */
export interface CaseAssignmentInfo {
  age?: number;
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
  if (caseInfo.age !== undefined && caseInfo.age < 18) {
    const childSpecialist = candidates.find(isChildSpecialist);
    if (childSpecialist) {
      return childSpecialist;
    }
  }
  return candidates[0] ?? null;
}
