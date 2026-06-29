import { describe, expect, it } from 'vitest';
import {
  ReferralType,
  resolveReferral,
} from '../../../src/domain/clinical/acute-psychotic-crisis';

describe('Acute Psychotic Crisis rule (RF-4.2.9)', () => {
  it('forces URGENT and locks it when a crisis is present', () => {
    const decision = resolveReferral({
      hasAcutePsychoticCrisis: true,
      requested: ReferralType.ROUTINE,
    });
    expect(decision.type).toBe(ReferralType.URGENT);
    expect(decision.locked).toBe(true);
  });

  it('respects the requested type when no crisis is present', () => {
    const decision = resolveReferral({
      hasAcutePsychoticCrisis: false,
      requested: ReferralType.ROUTINE,
    });
    expect(decision.type).toBe(ReferralType.ROUTINE);
    expect(decision.locked).toBe(false);
  });

  it('returns a frozen decision', () => {
    const decision = resolveReferral({
      hasAcutePsychoticCrisis: true,
      requested: ReferralType.ROUTINE,
    });
    expect(Object.isFrozen(decision)).toBe(true);
  });
});
