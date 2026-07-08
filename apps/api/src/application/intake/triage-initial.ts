import type { CaseBranch } from '../../domain/case/case.js';

/**
 * Initial Likert triage: routes to the red branch when the answer is at or below
 * the critical option (config `triage.likert_critical_option`), otherwise green.
 * The exact Likert direction is pending FPV validation.
 */
export function classifyInitialBranch(likert: number, likertCriticalOption: number): CaseBranch {
  return likert <= likertCriticalOption ? 'RED' : 'GREEN';
}
