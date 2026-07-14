import { describe, expect, it } from 'vitest';
import { toInternationalVePhone } from '../../src/shared/phone.js';

// Issue #129: the psychologist's wa.me link only works with 58 + 10 digits,
// no leading 0 and no +.
describe('toInternationalVePhone', () => {
  it('converts national format (leading 0) to international', () => {
    expect(toInternationalVePhone('0414-1234567')).toBe('584141234567');
  });

  it('is idempotent for already-international numbers, with or without +', () => {
    expect(toInternationalVePhone('584141234567')).toBe('584141234567');
    expect(toInternationalVePhone('+58 414 123 4567')).toBe('584141234567');
  });

  it('works for every mobile carrier prefix', () => {
    for (const carrier of ['412', '414', '416', '424', '426']) {
      expect(toInternationalVePhone(`0${carrier}1234567`)).toBe(`58${carrier}1234567`);
    }
  });

  it('falls back to the stripped input for a non-Venezuelan-mobile number', () => {
    expect(toInternationalVePhone('911')).toBe('911');
  });
});
