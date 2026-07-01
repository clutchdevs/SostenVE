import { describe, expect, it } from 'vitest';
import {
  CLINICAL_TAG_CATALOG,
  CLINICAL_TAG_ENTRY_LIST,
  TAG_CATALOG_VERSION,
  getCatalogTag,
} from '../../../src/domain/triage/triage-catalog';
import { classifyRisk } from '../../../src/domain/triage/classify-risk';
import { RiskLevel } from '../../../src/domain/triage/risk-level';
import { Severity } from '../../../src/domain/triage/severity';

const OPTIONS = { orangeTagsThresholdForEscalation: 3 };

describe('clinical tag catalog (FPV PRD RF-1.3)', () => {
  it('is versioned and complete (5 red · 9 orange · 8 yellow = 22)', () => {
    expect(TAG_CATALOG_VERSION).toBeTruthy();
    expect(CLINICAL_TAG_CATALOG.size).toBe(22);
    const bySeverity = (s: Severity) =>
      CLINICAL_TAG_ENTRY_LIST.filter((e) => e.severity === s).length;
    expect(bySeverity(Severity.RED)).toBe(5);
    expect(bySeverity(Severity.ORANGE)).toBe(9);
    expect(bySeverity(Severity.YELLOW)).toBe(8);
  });

  it('has unique codes and resolves them to frozen tags', () => {
    const codes = CLINICAL_TAG_ENTRY_LIST.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
    const tag = getCatalogTag('traumatic_grief');
    expect(tag?.severity).toBe(Severity.ORANGE);
    expect(getCatalogTag('does_not_exist')).toBeUndefined();
  });

  it('gives the PRD-flagged orange tags a higher weight than the default', () => {
    expect(getCatalogTag('traumatic_grief')?.weight).toBe(20);
    expect(getCatalogTag('survivor_guilt')?.weight).toBe(15);
    expect(getCatalogTag('panic_somatic')?.weight).toBe(10); // default orange
  });

  it('flags the infancia tags for a child-specialist assignment', () => {
    const childCodes = CLINICAL_TAG_ENTRY_LIST.filter((e) => e.childSpecialty).map((e) => e.code);
    expect(childCodes).toEqual([
      'child_mutism',
      'child_dysregulation',
      'child_psychoeducation',
      'child_sleep_regression',
    ]);
  });

  it('keeps the interruption rule: 1 red or 3 orange → high risk', () => {
    const red = getCatalogTag('psychotic_symptoms')!;
    const orange = getCatalogTag('freeze_response')!;
    const yellow = getCatalogTag('hypervigilance')!;

    expect(classifyRisk([red], OPTIONS)).toBe(RiskLevel.HIGH);
    expect(classifyRisk([orange, orange, orange], OPTIONS)).toBe(RiskLevel.HIGH);
    expect(classifyRisk([orange, orange], OPTIONS)).toBe(RiskLevel.MODERATE);
    expect(classifyRisk([yellow], OPTIONS)).toBe(RiskLevel.FOLLOW_UP);
  });
});
