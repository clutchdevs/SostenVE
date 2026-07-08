/**
 * Risk level produced by triage classification (Value Object).
 *
 * Domain values are in English. Mapping to the Spanish wire values
 * (`riesgo_alto`/`riesgo_moderado`/`seguimiento`) happens at the interface layer.
 * Each level has a `rank` so levels can be compared and the most severe chosen.
 */
export const RiskLevel = Object.freeze({
  HIGH: 'HIGH',
  MODERATE: 'MODERATE',
  FOLLOW_UP: 'FOLLOW_UP',
} as const);

export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

const RISK_RANK: Readonly<Record<RiskLevel, number>> = Object.freeze({
  [RiskLevel.HIGH]: 3,
  [RiskLevel.MODERATE]: 2,
  [RiskLevel.FOLLOW_UP]: 1,
});

export function riskRank(level: RiskLevel): number {
  return RISK_RANK[level];
}

/** Returns the most severe of two risk levels. */
export function mostSevere(a: RiskLevel, b: RiskLevel): RiskLevel {
  return riskRank(a) >= riskRank(b) ? a : b;
}

export function isHighRisk(level: RiskLevel): boolean {
  return level === RiskLevel.HIGH;
}
