import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../src/domain/shared/domain-error';
import {
  countBySeverity,
  createSymptomTag,
  hasSeverity,
} from '../../../src/domain/triage/symptom-tag';
import { Severity } from '../../../src/domain/triage/severity';

describe('createSymptomTag', () => {
  it('creates a frozen, immutable tag', () => {
    const tag = createSymptomTag({ code: 'panic_attacks', severity: Severity.ORANGE, weight: 10 });
    expect(Object.isFrozen(tag)).toBe(true);
    expect(() => {
      // @ts-expect-error verifying runtime immutability
      tag.weight = 999;
    }).toThrow();
  });

  it('trims the code', () => {
    const tag = createSymptomTag({ code: '  sad  ', severity: Severity.YELLOW, weight: 1 });
    expect(tag.code).toBe('sad');
  });

  it('rejects an empty code', () => {
    expect(() => createSymptomTag({ code: '  ', severity: Severity.RED, weight: 1 })).toThrow(
      DomainError,
    );
  });

  it('rejects a non-positive weight', () => {
    expect(() => createSymptomTag({ code: 'x', severity: Severity.RED, weight: 0 })).toThrow(
      DomainError,
    );
    expect(() => createSymptomTag({ code: 'x', severity: Severity.RED, weight: -5 })).toThrow(
      DomainError,
    );
  });

  it('rejects an invalid severity', () => {
    expect(() =>
      // @ts-expect-error invalid severity on purpose
      createSymptomTag({ code: 'x', severity: 'PURPLE', weight: 1 }),
    ).toThrow(DomainError);
  });
});

describe('tag severity helpers', () => {
  const tags = [
    createSymptomTag({ code: 'a', severity: Severity.ORANGE, weight: 10 }),
    createSymptomTag({ code: 'b', severity: Severity.ORANGE, weight: 10 }),
    createSymptomTag({ code: 'c', severity: Severity.YELLOW, weight: 1 }),
  ];

  it('counts by severity', () => {
    expect(countBySeverity(tags, Severity.ORANGE)).toBe(2);
    expect(countBySeverity(tags, Severity.RED)).toBe(0);
  });

  it('detects presence by severity', () => {
    expect(hasSeverity(tags, Severity.YELLOW)).toBe(true);
    expect(hasSeverity(tags, Severity.RED)).toBe(false);
  });
});
