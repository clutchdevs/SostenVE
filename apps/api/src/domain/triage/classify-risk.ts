import type { ClassificationOptions, RiskClassificationStrategy } from './classification-strategy.js';
import { RiskLevel } from './risk-level.js';
import { defaultStrategies } from './strategies.js';
import type { SymptomTag } from './symptom-tag.js';

/**
 * Classifies the risk level of a case from its selected clinical tags.
 *
 * Pure and deterministic: runs the strategy chain in order and returns the first
 * decisive result; if no strategy decides (e.g. no tags), defaults to FOLLOW_UP.
 *
 * Safety note: this is the core of the system's life-safety logic. A case must
 * never be under-classified — the high-risk strategies run first by design.
 */
export function classifyRisk(
  tags: readonly SymptomTag[],
  options: ClassificationOptions,
  strategies: readonly RiskClassificationStrategy[] = defaultStrategies,
): RiskLevel {
  for (const strategy of strategies) {
    const result = strategy.classify(tags, options);
    if (result !== null) {
      return result;
    }
  }
  return RiskLevel.FOLLOW_UP;
}
