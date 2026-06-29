import { describe, expect, it } from 'vitest';
import { classifyRisk } from '../../../src/domain/triage/classify-risk';
import { RiskLevel } from '../../../src/domain/triage/risk-level';
import { Severity } from '../../../src/domain/triage/severity';
import { createSymptomTag, type SymptomTag } from '../../../src/domain/triage/symptom-tag';

const OPTIONS = { orangeTagsThresholdForEscalation: 3 };

let counter = 0;
function tag(severity: Severity): SymptomTag {
  counter += 1;
  return createSymptomTag({ code: `tag_${counter}`, severity, weight: 1 });
}

describe('classifyRisk — interruption rule (flujo-central §1.5)', () => {
  it('escalates to HIGH with a single RED tag', () => {
    expect(classifyRisk([tag(Severity.RED)], OPTIONS)).toBe(RiskLevel.HIGH);
  });

  it('escalates to HIGH even if RED is mixed with lower severities', () => {
    const tags = [tag(Severity.YELLOW), tag(Severity.RED), tag(Severity.ORANGE)];
    expect(classifyRisk(tags, OPTIONS)).toBe(RiskLevel.HIGH);
  });

  it('escalates to HIGH with 3 ORANGE tags (threshold reached)', () => {
    const tags = [tag(Severity.ORANGE), tag(Severity.ORANGE), tag(Severity.ORANGE)];
    expect(classifyRisk(tags, OPTIONS)).toBe(RiskLevel.HIGH);
  });

  it('does NOT escalate with 2 ORANGE tags (below threshold) -> MODERATE', () => {
    const tags = [tag(Severity.ORANGE), tag(Severity.ORANGE)];
    expect(classifyRisk(tags, OPTIONS)).toBe(RiskLevel.MODERATE);
  });

  it('classifies a single ORANGE tag as MODERATE', () => {
    expect(classifyRisk([tag(Severity.ORANGE)], OPTIONS)).toBe(RiskLevel.MODERATE);
  });

  it('classifies only-YELLOW tags as FOLLOW_UP', () => {
    const tags = [tag(Severity.YELLOW), tag(Severity.YELLOW)];
    expect(classifyRisk(tags, OPTIONS)).toBe(RiskLevel.FOLLOW_UP);
  });

  it('classifies no tags as FOLLOW_UP', () => {
    expect(classifyRisk([], OPTIONS)).toBe(RiskLevel.FOLLOW_UP);
  });

  it('respects a custom escalation threshold', () => {
    const tags = [tag(Severity.ORANGE), tag(Severity.ORANGE)];
    expect(classifyRisk(tags, { orangeTagsThresholdForEscalation: 2 })).toBe(RiskLevel.HIGH);
  });
});
