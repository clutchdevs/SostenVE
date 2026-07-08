export { Severity, ALL_SEVERITIES, isSeverity } from './severity.js';
export { RiskLevel, riskRank, mostSevere, isHighRisk } from './risk-level.js';
export {
  createSymptomTag,
  countBySeverity,
  hasSeverity,
  type SymptomTag,
  type SymptomTagInput,
} from './symptom-tag.js';
export {
  DEFAULT_SEVERITY_WEIGHT,
  CLINICAL_TAG_CATALOG,
  CLINICAL_TAG_ENTRY_LIST,
  TAG_CATALOG_VERSION,
  getCatalogTag,
  type CatalogEntry,
} from './triage-catalog.js';
export {
  weightedUrgencyIndex,
  computeUrgencyIndex,
  URGENCY_WEIGHTS,
  RED_BRANCH_URGENCY,
  type UrgencyInput,
} from './urgency-index.js';
export {
  type ClassificationOptions,
  type RiskClassificationStrategy,
} from './classification-strategy.js';
export {
  redTagStrategy,
  orangeThresholdStrategy,
  orangePresenceStrategy,
  yellowPresenceStrategy,
  defaultStrategies,
} from './strategies.js';
export { classifyRisk } from './classify-risk.js';
