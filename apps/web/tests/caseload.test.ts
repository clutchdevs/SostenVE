import { describe, expect, it } from 'vitest';
import {
  caseLabel,
  contactMethod,
  displayName,
  EMPTY_FILTERS,
  filterCases,
  greeting,
  priorityStyle,
  sortByUrgency,
  summarizeCaseload,
} from '../src/features/psychologist-portal/caseload';
import type { CaseSummary } from '../src/lib/types';

function makeCase(overrides: Partial<CaseSummary>): CaseSummary {
  return {
    caso_id: 'abcd-1234',
    rama: 'verde',
    nivel_riesgo: 'seguimiento',
    score_urgencia: 1,
    estado: 'pendiente',
    creado_en: new Date('2026-06-15T10:00:00Z').toISOString(),
    sla_vence_en: null,
    ...overrides,
  };
}

describe('greeting', () => {
  it('changes with the time of day', () => {
    expect(greeting(new Date('2026-06-30T08:00:00'))).toBe('Buenos días');
    expect(greeting(new Date('2026-06-30T15:00:00'))).toBe('Buenas tardes');
    expect(greeting(new Date('2026-06-30T21:00:00'))).toBe('Buenas noches');
  });
});

describe('summarizeCaseload', () => {
  it('counts new (assigned), in-progress (accepted) and closed-this-month', () => {
    const now = new Date('2026-06-30T12:00:00Z');
    const cases = [
      makeCase({ estado: 'asignado' }),
      makeCase({ estado: 'aceptado' }),
      makeCase({ estado: 'aceptado' }),
      makeCase({ estado: 'cerrado', creado_en: new Date('2026-06-02T10:00:00Z').toISOString() }),
      // Closed but in a previous month → not counted this month.
      makeCase({ estado: 'cerrado', creado_en: new Date('2026-05-20T10:00:00Z').toISOString() }),
      makeCase({ estado: 'pendiente' }),
    ];
    expect(summarizeCaseload(cases, now)).toEqual({ nuevos: 1, enCurso: 2, atendidosMes: 1 });
  });
});

describe('priorityStyle', () => {
  it('maps each risk level and falls back for unknown', () => {
    expect(priorityStyle('riesgo_alto').label).toBe('Alta');
    expect(priorityStyle('riesgo_moderado').label).toBe('Moderada');
    expect(priorityStyle('seguimiento').label).toBe('Seguimiento');
    expect(priorityStyle('???').label).toBe('Sin clasificar');
  });
});

describe('sortByUrgency', () => {
  it('orders high risk before moderate before follow-up', () => {
    const sorted = sortByUrgency([
      makeCase({ caso_id: 'follow', nivel_riesgo: 'seguimiento' }),
      makeCase({ caso_id: 'high', nivel_riesgo: 'riesgo_alto' }),
      makeCase({ caso_id: 'mod', nivel_riesgo: 'riesgo_moderado' }),
    ]);
    expect(sorted.map((c) => c.caso_id)).toEqual(['high', 'mod', 'follow']);
  });
});

describe('labels', () => {
  it('builds a pseudonymous case label and contact method', () => {
    expect(caseLabel(makeCase({ caso_id: 'abcd-1234' }))).toBe('Caso ABCD');
    expect(contactMethod(makeCase({ modalidad: 'distancia' }))).toBe('A distancia');
    expect(contactMethod(makeCase({ modalidad: undefined }))).toBe('Sin definir');
  });

  it('prefers the requester name when available, else the case label', () => {
    expect(displayName(makeCase({ nombre: 'Ana Pérez' }))).toBe('Ana Pérez');
    expect(displayName(makeCase({ caso_id: 'abcd-1234', nombre: null }))).toBe('Caso ABCD');
  });
});

describe('filterCases', () => {
  const cases = [
    makeCase({ caso_id: 'a1', nivel_riesgo: 'riesgo_alto', rama: 'roja', nombre: 'Ana Pérez', contacto: '04141234567' }),
    makeCase({ caso_id: 'b2', nivel_riesgo: 'riesgo_moderado', rama: 'verde', nombre: 'Luis Rey', contacto: '04249998877' }),
    makeCase({ caso_id: 'c3', nivel_riesgo: 'seguimiento', rama: 'verde', nombre: 'María Díaz', contacto: '02125550000' }),
  ];

  it('returns everything with empty filters', () => {
    expect(filterCases(cases, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('filters by risk level', () => {
    const r = filterCases(cases, { ...EMPTY_FILTERS, risk: 'riesgo_alto' });
    expect(r.map((c) => c.caso_id)).toEqual(['a1']);
  });

  it('filters by branch (roja/verde)', () => {
    const r = filterCases(cases, { ...EMPTY_FILTERS, branch: 'verde' });
    expect(r.map((c) => c.caso_id)).toEqual(['b2', 'c3']);
  });

  it('searches by name (case-insensitive)', () => {
    const r = filterCases(cases, { ...EMPTY_FILTERS, search: 'maría' });
    expect(r.map((c) => c.caso_id)).toEqual(['c3']);
  });

  it('searches by phone number', () => {
    const r = filterCases(cases, { ...EMPTY_FILTERS, search: '4249998877' });
    expect(r.map((c) => c.caso_id)).toEqual(['b2']);
  });

  it('combines search with a risk filter', () => {
    const r = filterCases(cases, { ...EMPTY_FILTERS, search: 'e', risk: 'riesgo_moderado' });
    expect(r.map((c) => c.caso_id)).toEqual(['b2']);
  });
});
