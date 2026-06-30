import { describe, expect, it } from 'vitest';
import {
  caseCode,
  isLive,
  requesterLabel,
  slaState,
  sortForBoard,
  statusLabel,
  summarizeOps,
} from '../src/features/coordinator/operations';
import type { CaseSummary } from '../src/lib/types';

function makeCase(overrides: Partial<CaseSummary>): CaseSummary {
  return {
    caso_id: 'abcd-1234',
    rama: 'verde',
    nivel_riesgo: 'seguimiento',
    score_urgencia: 1,
    estado: 'pendiente',
    creado_en: new Date('2026-06-30T12:00:00Z').toISOString(),
    sla_vence_en: null,
    ...overrides,
  };
}

const NOW = new Date('2026-06-30T12:10:00Z');

describe('labels', () => {
  it('builds a stable pseudonymous label and short code', () => {
    expect(requesterLabel(makeCase({ caso_id: 'abcd-1234' }))).toMatch(/^Solicitante [A-Z]\.$/);
    expect(caseCode(makeCase({ caso_id: 'abcd-1234' }))).toBe('C-1234');
    expect(statusLabel('aceptado')).toBe('En curso');
  });
});

describe('slaState', () => {
  it('classifies expired, warning, healthy and waiting', () => {
    expect(slaState(makeCase({ sla_vence_en: null }), NOW).tone).toBe('waiting');
    expect(
      slaState(makeCase({ sla_vence_en: new Date('2026-06-30T12:07:00Z').toISOString() }), NOW),
    ).toEqual({ label: 'Vencido +3 min', tone: 'expired' });
    expect(
      slaState(makeCase({ sla_vence_en: new Date('2026-06-30T12:14:00Z').toISOString() }), NOW).tone,
    ).toBe('warning');
    expect(
      slaState(makeCase({ sla_vence_en: new Date('2026-06-30T12:40:00Z').toISOString() }), NOW),
    ).toEqual({ label: 'OK', tone: 'healthy' });
  });
});

describe('summarizeOps', () => {
  it('rolls up KPIs over live cases', () => {
    const cases = [
      makeCase({ caso_id: '1', nivel_riesgo: 'riesgo_alto', estado: 'pendiente', sla_vence_en: new Date('2026-06-30T12:05:00Z').toISOString() }),
      makeCase({ caso_id: '2', nivel_riesgo: 'riesgo_moderado', estado: 'asignado', asignado_a: 'Dra. Pérez' }),
      makeCase({ caso_id: '3', estado: 'aceptado', asignado_a: 'Lic. Rivas' }),
      makeCase({ caso_id: '4', estado: 'cerrado' }), // not live → ignored
    ];
    const s = summarizeOps(cases, NOW);
    expect(s.riesgoAlto).toBe(1);
    expect(s.enCola).toBe(1);
    expect(s.psicologos).toBe(2);
    expect(s.slaVencidos).toBe(1);
  });
});

describe('isLive / sortForBoard', () => {
  it('excludes closed cases and puts expired SLA first', () => {
    expect(isLive(makeCase({ estado: 'cerrado' }))).toBe(false);
    const sorted = sortForBoard(
      [
        makeCase({ caso_id: 'ok', nivel_riesgo: 'seguimiento' }),
        makeCase({ caso_id: 'expired', nivel_riesgo: 'seguimiento', sla_vence_en: new Date('2026-06-30T12:00:00Z').toISOString() }),
        makeCase({ caso_id: 'closed', estado: 'cerrado' }),
      ],
      NOW,
    );
    expect(sorted.map((c) => c.caso_id)).toEqual(['expired', 'ok']);
  });
});
