import type { RiskClassificationStrategy } from './classification-strategy';
import { RiskLevel } from './risk-level';
import { Severity } from './severity';
import { countBySeverity, hasSeverity } from './symptom-tag';

/**
 * Risk-classification strategies (interruption rule from flujo-central.md §1.5).
 * Evaluated in order by {@link classifyRisk}; the first non-null result wins.
 */

/** "1 red tag" → high risk. */
export const redTagStrategy: RiskClassificationStrategy = {
  name: 'red-tag',
  classify(tags) {
    return hasSeverity(tags, Severity.RED) ? RiskLevel.HIGH : null;
  },
};

/** "3+ orange tags" → high risk (threshold injected via options). */
export const orangeThresholdStrategy: RiskClassificationStrategy = {
  name: 'orange-threshold',
  classify(tags, options) {
    return countBySeverity(tags, Severity.ORANGE) >= options.orangeTagsThresholdForEscalation
      ? RiskLevel.HIGH
      : null;
  },
};

/** Any orange tag below the escalation threshold → moderate. */
export const orangePresenceStrategy: RiskClassificationStrategy = {
  name: 'orange-presence',
  classify(tags) {
    return hasSeverity(tags, Severity.ORANGE) ? RiskLevel.MODERATE : null;
  },
};

/** Only yellow tags → follow-up. */
export const yellowPresenceStrategy: RiskClassificationStrategy = {
  name: 'yellow-presence',
  classify(tags) {
    return hasSeverity(tags, Severity.YELLOW) ? RiskLevel.FOLLOW_UP : null;
  },
};

/**
 * Default ordered strategy chain. Order matters: high-risk rules first so that a
 * RED tag (or enough ORANGE tags) always escalates regardless of other tags.
 */
export const defaultStrategies: readonly RiskClassificationStrategy[] = Object.freeze([
  redTagStrategy,
  orangeThresholdStrategy,
  orangePresenceStrategy,
  yellowPresenceStrategy,
]);
