export { Severity, ALL_SEVERITIES, isSeverity } from './severity';
export { RiskLevel, riskRank, mostSevere, isHighRisk } from './risk-level';
export {
  createSymptomTag,
  countBySeverity,
  hasSeverity,
  type SymptomTag,
  type SymptomTagInput,
} from './symptom-tag';
export {
  DEFAULT_SEVERITY_WEIGHT,
  CLINICAL_TAG_CATALOG,
  CLINICAL_TAG_ENTRY_LIST,
  TAG_CATALOG_VERSION,
  getCatalogTag,
  type CatalogEntry,
} from './triage-catalog';
export {
  weightedUrgencyIndex,
  computeUrgencyIndex,
  URGENCY_WEIGHTS,
  RED_BRANCH_URGENCY,
  type UrgencyInput,
} from './urgency-index';
export {
  type ClassificationOptions,
  type RiskClassificationStrategy,
} from './classification-strategy';
export {
  redTagStrategy,
  orangeThresholdStrategy,
  orangePresenceStrategy,
  yellowPresenceStrategy,
  defaultStrategies,
} from './strategies';
export { classifyRisk } from './classify-risk';
