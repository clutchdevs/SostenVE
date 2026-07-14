import { describe, expect, it } from 'vitest';
import {
  formatPhoneDisplay,
  isValidDocumentNumber,
  isValidVePhone,
  normalizePhone,
  toInternationalVePhone,
} from '../src/lib/validation';

describe('isValidVePhone', () => {
  it('accepts every mobile carrier prefix when the +58 country code is present (issue #129)', () => {
    for (const ok of [
      '+584121234567',
      '+584141234567',
      '+584161234567',
      '+584241234567',
      '+584261234567',
      '584141234567',
      '+58 414 123 4567',
      '(+58) 426-123.4567',
    ]) {
      expect(isValidVePhone(ok), ok).toBe(true);
    }
  });

  it('rejects the national leading-0 form, letters, wrong length, landlines and non-mobile prefixes', () => {
    for (const bad of [
      '',
      'abc',
      '0414-1234567', // national leading-0 form — must include +58 (issue #129)
      '04141234567', // national leading-0, no separators
      '4141234567', // no country code at all
      '0414123456a', // letters
      '123',
      '5841412345', // +58 but too short
      '58414123456789', // +58 but too long
      '041412345678889999999', // absurdly long
      '+582121234567', // +58 Caracas landline (not a mobile prefix)
      '+584101234567', // +58 but 410 is not a carrier prefix
      '+58314123456',
      '1234567890',
    ]) {
      expect(isValidVePhone(bad), bad).toBe(false);
    }
  });

  it('normalizePhone strips separators but keeps a leading +', () => {
    expect(normalizePhone(' +58 (414) 123-45.67 ')).toBe('+584141234567');
  });
});

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

  it('falls back to the stripped input for a non-Venezuelan-mobile number', () => {
    expect(toInternationalVePhone('911')).toBe('911');
  });
});

describe('formatPhoneDisplay', () => {
  it('standardizes Venezuelan national numbers regardless of input', () => {
    for (const input of ['04149247715', '0414-924-7715', '0414 9247715', '(0414) 924.7715']) {
      expect(formatPhoneDisplay(input), input).toBe('0414-9247715');
    }
  });

  it('standardizes Venezuelan international (+58) numbers', () => {
    for (const input of ['+584242907338', '+58 424 290 7338', '58 424-2907338']) {
      expect(formatPhoneDisplay(input), input).toBe('+58 424-2907338');
    }
  });

  it('leaves short service/emergency codes as-is', () => {
    expect(formatPhoneDisplay('911')).toBe('911');
  });

  it('keeps other international numbers clean with their country code', () => {
    expect(formatPhoneDisplay('+593 99-081 3326')).toBe('+593990813326');
  });
});

describe('isValidDocumentNumber', () => {
  it('accepts a V/E cédula of up to 8 digits', () => {
    expect(isValidDocumentNumber('12345678', 'V')).toBe(true);
    expect(isValidDocumentNumber('1234', 'E')).toBe(true);
  });

  it('rejects a cédula with letters or more than 8 digits', () => {
    expect(isValidDocumentNumber('123456789', 'V')).toBe(false); // 9 digits
    expect(isValidDocumentNumber('1234567a', 'V')).toBe(false); // letter
    expect(isValidDocumentNumber('', 'V')).toBe(false);
  });

  it('accepts an alphanumeric passport (P)', () => {
    expect(isValidDocumentNumber('AB1234567', 'P')).toBe(true);
    expect(isValidDocumentNumber('123', 'P')).toBe(false); // too short
  });
});
