import { describe, expect, it } from 'vitest';
import {
  assignmentSettingsSchema,
  greenBranchSchema,
  isValidDocumentNumber,
  registerVolunteerSchema,
  venezuelanPhoneSchema,
} from '../../../src/interfaces/http/v1/schemas';

describe('venezuelanPhoneSchema', () => {
  it('accepts mobile carrier prefixes (tolerant of separators / +58)', () => {
    for (const ok of ['0412-1234567', '0414-1234567', '0426 1234567', '+584241234567']) {
      expect(venezuelanPhoneSchema.safeParse(ok).success, ok).toBe(true);
    }
  });

  it('rejects letters, wrong length, landlines and non-mobile prefixes', () => {
    for (const bad of [
      '',
      'abc',
      '0414123456a',
      '123',
      '041412345678889999999', // absurdly long
      '02121234567', // landline
      '0410-1234567', // not a carrier prefix
    ]) {
      expect(venezuelanPhoneSchema.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe('isValidDocumentNumber', () => {
  it('limits a V/E cédula to 8 digits and requires a passport to be alphanumeric', () => {
    expect(isValidDocumentNumber('V', '12345678')).toBe(true);
    expect(isValidDocumentNumber('V', '123456789')).toBe(false);
    expect(isValidDocumentNumber('E', '1234abc')).toBe(false);
    expect(isValidDocumentNumber('P', 'AB1234567')).toBe(true);
  });
});

describe('registerVolunteerSchema', () => {
  const base = {
    nombre: 'Ana',
    tipo_documento: 'V' as const,
    numero_documento: '12345678',
    numero_fpv: 'FPV-1',
    email: 'ana@example.com',
    telefono: '0414-1234567',
    universidad: 'UCV',
    anio_egreso: 2015,
    colegio: 'Colegio de Psicólogos de Miranda',
    modalidad: ['presencial' as const],
    disponibilidad_horaria: [{ dia: 'lunes' as const, bloque: 'manana' as const }],
    pap: false,
    consentimiento: true as const,
    consentimiento_version: 'v1',
  };

  it('accepts a well-formed registration', () => {
    expect(registerVolunteerSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a phone with letters', () => {
    expect(registerVolunteerSchema.safeParse({ ...base, telefono: '0414-ABC4567' }).success).toBe(
      false,
    );
  });

  it('rejects a cédula longer than 8 digits', () => {
    expect(
      registerVolunteerSchema.safeParse({ ...base, numero_documento: '123456789' }).success,
    ).toBe(false);
  });
});

describe('assignmentSettingsSchema', () => {
  it('accepts a positive integer caseload within range', () => {
    expect(assignmentSettingsSchema.safeParse({ max_active_caseload: 6 }).success).toBe(true);
    expect(assignmentSettingsSchema.safeParse({ max_active_caseload: 1 }).success).toBe(true);
  });

  it('rejects zero, negatives, non-integers and out-of-range values', () => {
    for (const n of [0, -1, 3.5, 101]) {
      expect(assignmentSettingsSchema.safeParse({ max_active_caseload: n }).success, `${n}`).toBe(
        false,
      );
    }
  });
});

describe('greenBranchSchema', () => {
  it('requires a valid Venezuelan contact phone', () => {
    expect(greenBranchSchema.safeParse({ contacto: '0414-1234567', tags: [] }).success).toBe(true);
    expect(greenBranchSchema.safeParse({ contacto: 'no-soy-un-telefono', tags: [] }).success).toBe(
      false,
    );
  });
});
