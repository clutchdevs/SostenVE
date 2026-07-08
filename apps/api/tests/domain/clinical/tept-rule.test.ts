import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../src/domain/shared/domain-error';
import {
  assertCanDiagnoseTept,
  canDiagnoseTept,
  daysBetween,
} from '../../../src/domain/clinical/tept-rule';

const BLOCK_DAYS = 30;
const EVENT = new Date('2026-06-24T00:00:00Z');

function eventPlusDays(days: number): Date {
  return new Date(EVENT.getTime() + days * 24 * 60 * 60 * 1000);
}

describe('TEPT diagnosis rule (RF-4.3)', () => {
  it('computes elapsed days', () => {
    expect(daysBetween(EVENT, eventPlusDays(29))).toBe(29);
  });

  it('blocks diagnosis on day 29 (boundary below)', () => {
    expect(canDiagnoseTept(EVENT, eventPlusDays(29), BLOCK_DAYS)).toBe(false);
  });

  it('allows diagnosis on day 30 (boundary)', () => {
    expect(canDiagnoseTept(EVENT, eventPlusDays(30), BLOCK_DAYS)).toBe(true);
  });

  it('allows diagnosis after the block window', () => {
    expect(canDiagnoseTept(EVENT, eventPlusDays(45), BLOCK_DAYS)).toBe(true);
  });

  it('assert throws a DomainError before the window', () => {
    expect(() => assertCanDiagnoseTept(EVENT, eventPlusDays(10), BLOCK_DAYS)).toThrow(DomainError);
  });

  it('assert does not throw after the window', () => {
    expect(() => assertCanDiagnoseTept(EVENT, eventPlusDays(31), BLOCK_DAYS)).not.toThrow();
  });
});
