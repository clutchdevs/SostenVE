import type { RiskLevel } from './risk-level';
import type { SymptomTag } from './symptom-tag';

/** Options injected by the application layer (from the config singleton). */
export interface ClassificationOptions {
  /** Number of ORANGE tags that, by itself, escalates a case to high risk. */
  readonly orangeTagsThresholdForEscalation: number;
}

/**
 * A single risk-classification rule (Strategy pattern).
 *
 * `classify` returns a {@link RiskLevel} when this strategy is decisive for the
 * given tags, or `null` to defer to the next strategy. New rules (e.g. the
 * Phase 2 lexical-semantic analyzer) can be added without touching the others.
 */
export interface RiskClassificationStrategy {
  readonly name: string;
  classify(tags: readonly SymptomTag[], options: ClassificationOptions): RiskLevel | null;
}
