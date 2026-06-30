import { describe, expect, it } from 'vitest';
import {
  autoValidationRate,
  exceptionLabel,
  filterVolunteers,
  initialsOf,
} from '../src/features/admin/volunteers';
import type { VolunteerView } from '../src/lib/types';

function makeVolunteer(overrides: Partial<VolunteerView>): VolunteerView {
  return {
    id: 'v1',
    nombre: 'Ana Pérez',
    cedula_profesional: 'FPV-100',
    email: 'ana@example.com',
    especialidad: 'Clínica adultos',
    rol: 'psychologist',
    estado: 'active',
    motivo_excepcion: null,
    creado_en: new Date().toISOString(),
    ...overrides,
  };
}

describe('exceptionLabel', () => {
  it('maps known reasons and falls back for null', () => {
    expect(exceptionLabel('fpv_unreachable')).toMatch(/timeout/i);
    expect(exceptionLabel('fpv_not_found')).toMatch(/padrón/i);
    expect(exceptionLabel('pap_not_declared')).toMatch(/PAP/);
    expect(exceptionLabel(null)).toMatch(/no superada/i);
  });
});

describe('autoValidationRate', () => {
  it('computes active over (active + pending) for psychologists', () => {
    const roster = [
      makeVolunteer({ id: '1', estado: 'active' }),
      makeVolunteer({ id: '2', estado: 'active' }),
      makeVolunteer({ id: '3', estado: 'active' }),
      makeVolunteer({ id: '4', estado: 'pending_approval', motivo_excepcion: 'fpv_unreachable' }),
      // Coordinators/admins are ignored.
      makeVolunteer({ id: '5', rol: 'coordinator', estado: 'pending_approval' }),
    ];
    expect(autoValidationRate(roster)).toBe(75);
  });

  it('returns null when there is nothing to measure', () => {
    expect(autoValidationRate([])).toBeNull();
  });
});

describe('filterVolunteers', () => {
  const roster = [
    makeVolunteer({ id: '1', nombre: 'Ana Pérez', estado: 'active', cedula_profesional: 'FPV-100' }),
    makeVolunteer({ id: '2', nombre: 'Luis Rey', estado: 'pending_approval', cedula_profesional: 'FPV-200' }),
    makeVolunteer({ id: '3', nombre: 'María Díaz', estado: 'inactive', cedula_profesional: 'FPV-300' }),
  ];

  it('filters by status', () => {
    expect(filterVolunteers(roster, '', 'pending_approval').map((v) => v.id)).toEqual(['2']);
    expect(filterVolunteers(roster, '', 'all')).toHaveLength(3);
  });

  it('searches by name or FPV id', () => {
    expect(filterVolunteers(roster, 'maría', 'all').map((v) => v.id)).toEqual(['3']);
    expect(filterVolunteers(roster, 'fpv-200', 'all').map((v) => v.id)).toEqual(['2']);
  });
});

describe('initialsOf', () => {
  it('takes first and last initials', () => {
    expect(initialsOf('Ana Pérez')).toBe('AP');
    expect(initialsOf('Madonna')).toBe('M');
  });
});
