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
  PROVISIONAL_TAG_CATALOG,
  getProvisionalTag,
} from './triage-catalog';
export { weightedUrgencyIndex } from './urgency-index';
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
