import { describe, expect, it } from 'vitest';
import { RiskLevel, isHighRisk, mostSevere, riskRank } from '../../../src/domain/triage/risk-level';

describe('RiskLevel', () => {
  it('ranks HIGH > MODERATE > FOLLOW_UP', () => {
    expect(riskRank(RiskLevel.HIGH)).toBeGreaterThan(riskRank(RiskLevel.MODERATE));
    expect(riskRank(RiskLevel.MODERATE)).toBeGreaterThan(riskRank(RiskLevel.FOLLOW_UP));
  });

  it('returns the most severe of two levels', () => {
    expect(mostSevere(RiskLevel.FOLLOW_UP, RiskLevel.HIGH)).toBe(RiskLevel.HIGH);
    expect(mostSevere(RiskLevel.MODERATE, RiskLevel.FOLLOW_UP)).toBe(RiskLevel.MODERATE);
  });

  it('identifies high risk', () => {
    expect(isHighRisk(RiskLevel.HIGH)).toBe(true);
    expect(isHighRisk(RiskLevel.MODERATE)).toBe(false);
  });
});
