import { describe, expect, it } from 'vitest';
import { Severity } from '../../../src/domain/triage/severity';
import { createSymptomTag } from '../../../src/domain/triage/symptom-tag';
import { DEFAULT_SEVERITY_WEIGHT } from '../../../src/domain/triage/triage-catalog';
import { weightedUrgencyIndex } from '../../../src/domain/triage/urgency-index';

function tag(severity: Severity) {
  return createSymptomTag({
    code: `tag_${severity}`,
    severity,
    weight: DEFAULT_SEVERITY_WEIGHT[severity],
  });
}

describe('weightedUrgencyIndex (RF-1.5)', () => {
  it('returns 0 for no tags', () => {
    expect(weightedUrgencyIndex([])).toBe(0);
  });

  it('sums the weights deterministically', () => {
    const tags = [tag(Severity.ORANGE), tag(Severity.YELLOW)];
    expect(weightedUrgencyIndex(tags)).toBe(
      DEFAULT_SEVERITY_WEIGHT.ORANGE + DEFAULT_SEVERITY_WEIGHT.YELLOW,
    );
  });

  it('is order-independent', () => {
    const a = tag(Severity.RED);
    const b = tag(Severity.YELLOW);
    expect(weightedUrgencyIndex([a, b])).toBe(weightedUrgencyIndex([b, a]));
  });

  it('ranks higher severity above lower severity', () => {
    expect(weightedUrgencyIndex([tag(Severity.RED)])).toBeGreaterThan(
      weightedUrgencyIndex([tag(Severity.ORANGE)]),
    );
    expect(weightedUrgencyIndex([tag(Severity.ORANGE)])).toBeGreaterThan(
      weightedUrgencyIndex([tag(Severity.YELLOW)]),
    );
  });
});
