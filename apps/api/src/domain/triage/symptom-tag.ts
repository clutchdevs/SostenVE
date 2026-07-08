import { DomainError } from '../shared/domain-error.js';
import { Severity, isSeverity } from './severity.js';

/**
 * A clinical tag selected during the green-branch conversational form
 * (Value Object). Immutable: built through {@link createSymptomTag}, which
 * validates invariants and freezes the result.
 *
 * The catalog of concrete tags and their final weights is validated by an FPV
 * psychologist (TODO — Human-in-the-Loop, ADR-0010); this type carries whatever
 * weight/severity the catalog assigns.
 */
export interface SymptomTag {
  readonly code: string;
  readonly severity: Severity;
  readonly weight: number;
}

export interface SymptomTagInput {
  code: string;
  severity: Severity;
  weight: number;
}

export function createSymptomTag(input: SymptomTagInput): SymptomTag {
  const code = input.code?.trim();
  if (!code) {
    throw new DomainError('SymptomTag.code must be a non-empty string');
  }
  if (!isSeverity(input.severity)) {
    throw new DomainError(`SymptomTag.severity is invalid: ${String(input.severity)}`);
  }
  if (!Number.isFinite(input.weight) || input.weight <= 0) {
    throw new DomainError('SymptomTag.weight must be a positive finite number');
  }

  return Object.freeze({
    code,
    severity: input.severity,
    weight: input.weight,
  });
}

export function countBySeverity(tags: readonly SymptomTag[], severity: Severity): number {
  return tags.reduce((total, tag) => (tag.severity === severity ? total + 1 : total), 0);
}

export function hasSeverity(tags: readonly SymptomTag[], severity: Severity): boolean {
  return tags.some((tag) => tag.severity === severity);
}
