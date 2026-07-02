import type { Volunteer } from '../volunteer/volunteer';

/**
 * Pure volunteer selection for a case. Preferences are layered (all soft, so a
 * case is never stranded when a preferred match is unavailable):
 *  1. Clinical fit — a child specialist when the case needs one, either from
 *     "Infancia" tags (RF-1.3, `requiresChildSpecialty`) or a minor requester
 *     (`age < 18`).
 *  2. Regional cluster (RF-3.1) — within the resulting pool, prefer a volunteer
 *     of the requester's `region` (matched against their Colegio).
 * Falls back to the first candidate otherwise. Returns `null` when there are no
 * candidates. Load balancing is intentionally simple (first match) for the MVP.
 */
export interface CaseAssignmentInfo {
  age?: number;
  /** Case carries childhood tags → prefer a child specialist (RF-1.3). */
  requiresChildSpecialty?: boolean;
  /** Requester's state → prefer a same-region volunteer (RF-3.1). */
  region?: string;
}

const CHILD_SPECIALTY_KEYWORDS = ['infantil', 'niñ', 'nin', 'adolescen', 'child'];

function isChildSpecialist(volunteer: Volunteer): boolean {
  const specialty = volunteer.specialty?.toLowerCase() ?? '';
  return CHILD_SPECIALTY_KEYWORDS.some((keyword) => specialty.includes(keyword));
}

/** Accent-insensitive, lowercase normalization for loose region matching. */
function normalizeRegion(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * A volunteer belongs to the case's region if the requester's state name appears
 * in their (free-text) Colegio, e.g. state "Miranda" ⊆ "Colegio de Psicólogos de
 * Miranda". Loose on purpose since the Colegio is not a structured state field.
 */
function inRegion(volunteer: Volunteer, region: string): boolean {
  if (!volunteer.colegio) return false;
  return normalizeRegion(volunteer.colegio).includes(normalizeRegion(region));
}

export function selectVolunteerForCase(
  candidates: readonly Volunteer[],
  caseInfo: CaseAssignmentInfo,
): Volunteer | null {
  if (candidates.length === 0) {
    return null;
  }

  // 1) Clinical fit: narrow to child specialists when needed and available.
  let pool: readonly Volunteer[] = candidates;
  const needsChildSpecialist =
    caseInfo.requiresChildSpecialty === true ||
    (caseInfo.age !== undefined && caseInfo.age < 18);
  if (needsChildSpecialist) {
    const specialists = candidates.filter(isChildSpecialist);
    if (specialists.length > 0) pool = specialists;
  }

  // 2) Regional cluster preference within the pool; never strands the case.
  const { region } = caseInfo;
  if (region) {
    const regional = pool.filter((v) => inRegion(v, region));
    if (regional.length > 0) return regional[0] ?? null;
  }

  return pool[0] ?? null;
}
