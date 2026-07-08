import { describe, expect, it } from 'vitest';
import { Severity } from '../../../src/domain/triage/severity.js';
import { createSymptomTag } from '../../../src/domain/triage/symptom-tag.js';
import { DEFAULT_SEVERITY_WEIGHT } from '../../../src/domain/triage/triage-catalog.js';
import {
  computeUrgencyIndex,
  RED_BRANCH_URGENCY,
  URGENCY_WEIGHTS,
  weightedUrgencyIndex,
} from '../../../src/domain/triage/urgency-index.js';

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

describe('computeUrgencyIndex — full formula (RF-1.5)', () => {
  it('adds the dominant ideation term when a RED tag is present', () => {
    const withRed = computeUrgencyIndex({ tags: [tag(Severity.RED)] });
    expect(withRed).toBe(URGENCY_WEIGHTS.ideation + DEFAULT_SEVERITY_WEIGHT.RED);
  });

  it('makes a single ideation case outrank any pile of non-RED tags', () => {
    const ideation = computeUrgencyIndex({ tags: [tag(Severity.RED)] });
    const manyOrange = computeUrgencyIndex({
      tags: Array.from({ length: 20 }, () => tag(Severity.ORANGE)),
    });
    expect(ideation).toBeGreaterThan(manyOrange);
  });

  it('adds one point per reported habit change', () => {
    const base = computeUrgencyIndex({ tags: [tag(Severity.YELLOW)] });
    const withHabits = computeUrgencyIndex({
      tags: [tag(Severity.YELLOW)],
      habitChangeCount: 3,
    });
    expect(withHabits).toBe(base + 3 * URGENCY_WEIGHTS.habitChange);
  });

  it('ignores a negative habit count and defaults to zero', () => {
    expect(computeUrgencyIndex({ tags: [], habitChangeCount: -5 })).toBe(0);
    expect(computeUrgencyIndex({ tags: [] })).toBe(0);
  });

  it('places a red-branch case at ideation level', () => {
    expect(RED_BRANCH_URGENCY).toBe(URGENCY_WEIGHTS.ideation + DEFAULT_SEVERITY_WEIGHT.RED);
    // A green case with one red tag and a red-branch case share the top tier.
    expect(computeUrgencyIndex({ tags: [tag(Severity.RED)] })).toBe(RED_BRANCH_URGENCY);
  });
});
