import { DEFAULT_SEVERITY_WEIGHT } from './triage-catalog';
import { Severity } from './severity';
import { hasSeverity, type SymptomTag } from './symptom-tag';

/**
 * Weighted Urgency Index (RF-1.5).
 *
 * U = w_id · I_ideacion  +  Σ peso(tag)  +  w_hab · n_cambios_habito
 *
 * - `I_ideacion` is a **binary** indicator: 1 when any life-risk (RED) tag is
 *   present (suicidal ideation / acute psychosis). Its weight dominates every
 *   other term so a single ideation signal pushes the case to the **top** of the
 *   assignment queue, regardless of how many other tags it carries (PRD RF-1.5).
 * - `Σ peso(tag)` is the weighted sum of the selected clinical tags (RED ≫ ORANGE
 *   ≫ YELLOW per the FPV-validated catalog).
 * - `n_cambios_habito` is the number of recent habit changes the requester
 *   reported (green-branch screen 5): a mild adaptive-stress signal.
 *
 * Pure and deterministic. The coefficients were validated by the FPV
 * (2026-07-03, ADR-0010); they stay named and isolated so a psychologist can
 * still retune them centrally without touching the engine.
 */
export const URGENCY_WEIGHTS = Object.freeze({
  /** w_id — dominant: any RED tag tops the queue. */
  ideation: 1000,
  /** w_hab — per reported habit change (green-branch screen 5). */
  habitChange: 1,
});

/** Urgency assigned to a red-branch case (self-declared critical emergency). */
export const RED_BRANCH_URGENCY = URGENCY_WEIGHTS.ideation + DEFAULT_SEVERITY_WEIGHT[Severity.RED];

export interface UrgencyInput {
  tags: readonly SymptomTag[];
  /** Count of recent habit changes reported on the green-branch screen 5. */
  habitChangeCount?: number;
}

export function computeUrgencyIndex(input: UrgencyInput): number {
  const { tags, habitChangeCount = 0 } = input;
  const ideation = hasSeverity(tags, Severity.RED) ? URGENCY_WEIGHTS.ideation : 0;
  const tagWeight = tags.reduce((total, tag) => total + tag.weight, 0);
  const habit = URGENCY_WEIGHTS.habitChange * Math.max(0, habitChangeCount);
  return ideation + tagWeight + habit;
}

/**
 * Backward-compatible helper: the urgency index of a tag set with no other
 * signals. Equivalent to `computeUrgencyIndex({ tags })`.
 */
export function weightedUrgencyIndex(tags: readonly SymptomTag[]): number {
  return computeUrgencyIndex({ tags });
}
