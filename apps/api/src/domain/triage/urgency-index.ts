import type { SymptomTag } from './symptom-tag';

/**
 * Weighted Urgency Index (RF-1.5).
 *
 * Pure, deterministic function: the urgency of a case is the sum of the weights
 * of its selected tags. Higher severity tags carry higher weights (see the
 * provisional catalog), so more/severe tags yield a higher index. The exact
 * formula and weights are pending FPV validation (TODO — Human-in-the-Loop).
 */
export function weightedUrgencyIndex(tags: readonly SymptomTag[]): number {
  return tags.reduce((total, tag) => total + tag.weight, 0);
}
