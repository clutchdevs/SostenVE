import { describe, expect, it } from 'vitest';
import { summarizeSla } from '../../../src/application/monitoring/sla-metrics';
import { RiskLevel } from '../../../src/domain/triage';
import type { Assignment } from '../../../src/domain/assignment/assignment';
import type { CaseRecord } from '../../../src/domain/case/case';

const T0 = new Date('2026-06-30T12:00:00Z');
const NOW = new Date('2026-06-30T12:30:00Z');

function makeCase(over: Partial<CaseRecord> & { id: string }): CaseRecord {
  return {
    pseudonymId: `p-${over.id}`,
    branch: 'GREEN',
    riskLevel: RiskLevel.MODERATE,
    urgencyScore: 1,
    status: 'PENDING',
    createdAt: T0,
    ...over,
  };
}

function assignment(caseId: string, minutesAfter: number): Assignment {
  return {
    id: `a-${caseId}`,
    caseId,
    volunteerId: 'v',
    assignedAt: new Date(T0.getTime() + minutesAfter * 60_000),
  };
}

describe('summarizeSla', () => {
  it('computes time-to-first-assignment per risk level (p50/p95/avg)', () => {
    const cases = [
      makeCase({ id: 'h1', riskLevel: RiskLevel.HIGH, status: 'ACCEPTED' }),
      makeCase({ id: 'h2', riskLevel: RiskLevel.HIGH, status: 'ACCEPTED' }),
      makeCase({ id: 'm1', riskLevel: RiskLevel.MODERATE, status: 'ASSIGNED' }),
    ];
    // h1 assigned at 2 min (120 s), h2 at 8 min (480 s), m1 at 5 min (300 s).
    const assignments = [assignment('h1', 2), assignment('h2', 8), assignment('m1', 5)];

    const m = summarizeSla(cases, assignments, NOW);
    expect(m.tiempo_asignacion.riesgo_alto).toEqual({
      count: 2,
      p50_seconds: 120,
      p95_seconds: 480,
      avg_seconds: 300,
    });
    expect(m.tiempo_asignacion.riesgo_moderado?.avg_seconds).toBe(300);
    expect(m.tiempo_asignacion.seguimiento).toBeNull();
    expect(m.totales).toEqual({ casos: 3, asignados: 3, cerrados: 0 });
  });

  it('counts the queue and high-risk SLA breaches', () => {
    const cases = [
      // High-risk, still pending, SLA already expired → breach + queued.
      makeCase({ id: 'q1', riskLevel: RiskLevel.HIGH, status: 'PENDING', slaExpiresAt: new Date(NOW.getTime() - 60_000) }),
      // High-risk assigned but overdue → breach (not queued).
      makeCase({ id: 'q2', riskLevel: RiskLevel.HIGH, status: 'ASSIGNED', slaExpiresAt: new Date(NOW.getTime() - 60_000) }),
      // High-risk assigned, SLA still in the future → no breach.
      makeCase({ id: 'q3', riskLevel: RiskLevel.HIGH, status: 'ASSIGNED', slaExpiresAt: new Date(NOW.getTime() + 60_000) }),
      // Moderate pending → queued, not a breach.
      makeCase({ id: 'q4', riskLevel: RiskLevel.MODERATE, status: 'PENDING' }),
      makeCase({ id: 'q5', status: 'CLOSED' }),
    ];
    const m = summarizeSla(cases, [], NOW);
    expect(m.cola).toEqual({ pendientes: 2, riesgo_alto_pendientes: 1, sla_vencidos: 2 });
    expect(m.totales).toEqual({ casos: 5, asignados: 0, cerrados: 1 });
  });
});
