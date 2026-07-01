import { describe, expect, it } from 'vitest';
import { TAG_CATALOG, TAG_CATALOG_VERSION } from '../src/features/intake/tag-catalog';

describe('web tag catalog mirror (FPV PRD RF-1.3)', () => {
  it('mirrors the versioned, complete catalog (5 red · 9 orange · 8 yellow)', () => {
    // Kept in sync with the backend domain catalog.
    expect(TAG_CATALOG_VERSION).toBe('v1.0.0-fpv-prd-rf-1.3');
    expect(TAG_CATALOG).toHaveLength(22);
    const count = (s: string) => TAG_CATALOG.filter((t) => t.severity === s).length;
    expect(count('red')).toBe(5);
    expect(count('orange')).toBe(9);
    expect(count('yellow')).toBe(8);
  });

  it('has unique codes and a Spanish label for each tag', () => {
    const codes = TAG_CATALOG.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(TAG_CATALOG.every((t) => t.label.trim().length > 0)).toBe(true);
  });

  it('marks the four infancia tags for a child specialist', () => {
    expect(TAG_CATALOG.filter((t) => t.childSpecialty).map((t) => t.code)).toEqual([
      'child_mutism',
      'child_dysregulation',
      'child_psychoeducation',
      'child_sleep_regression',
    ]);
  });
});
