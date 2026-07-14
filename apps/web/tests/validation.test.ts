import { describe, expect, it } from 'vitest';
import {
  formatPhoneDisplay,
  isValidDocumentNumber,
  isValidVePhone,
  normalizePhone,
} from '../src/lib/validation';

describe('isValidVePhone', () => {
  it('accepts every mobile carrier prefix, with or without +58 and separators', () => {
    for (const ok of [
      '0412-1234567',
      '0414-1234567',
      '0416-1234567',
      '0424-1234567',
      '0426-1234567',
      '04141234567',
      '+584141234567',
      '+58 414 123 4567',
      '(0426) 123-4567',
    ]) {
      expect(isValidVePhone(ok), ok).toBe(true);
    }
  });

  it('rejects letters, wrong length, landlines and non-mobile prefixes', () => {
    for (const bad of [
      '',
      'abc',
      '0414123456a', // letters
      '123',
      '04141234', // too short
      '041412345678', // one digit too long
      '041412345678889999999', // absurdly long
      '02121234567', // Caracas landline (not a mobile prefix)
      '0410-1234567', // 0410 is not a valid carrier prefix
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
