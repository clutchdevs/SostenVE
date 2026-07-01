import { RiskLevel } from '../../domain/triage';
import type { Assignment } from '../../domain/assignment/assignment';
import type { CaseRecord } from '../../domain/case/case';

/**
 * SLA / queue metrics for the monitoring phase (fase 06). Pure and deterministic
 * so it is trivial to test; the endpoint feeds it the cases + assignments.
 *
 * "Tiempo de asignación" = seconds from case creation to its FIRST assignment,
 * bucketed by risk level (the charter success metric). We report p50/p95/avg.
 */
export interface DurationStats {
  count: number;
  p50_seconds: number;
  p95_seconds: number;
  avg_seconds: number;
}

export type RiskKey = 'riesgo_alto' | 'riesgo_moderado' | 'seguimiento';

export interface SlaMetrics {
  /** Time-to-first-assignment per risk level (null when no case was assigned). */
  tiempo_asignacion: Record<RiskKey, DurationStats | null>;
  cola: {
    pendientes: number;
    riesgo_alto_pendientes: number;
    /** High-risk cases whose acceptance SLA already expired (not yet accepted). */
    sla_vencidos: number;
  };
  totales: { casos: number; asignados: number; cerrados: number };
}

const RISK_KEY: Record<RiskLevel, RiskKey> = {
  [RiskLevel.HIGH]: 'riesgo_alto',
  [RiskLevel.MODERATE]: 'riesgo_moderado',
  [RiskLevel.FOLLOW_UP]: 'seguimiento',
};

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sortedAsc.length) - 1;
  const idx = Math.min(Math.max(rank, 0), sortedAsc.length - 1);
  return sortedAsc[idx]!;
}

function statsOf(durations: number[]): DurationStats | null {
  if (durations.length === 0) return null;
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    p50_seconds: percentile(sorted, 50),
    p95_seconds: percentile(sorted, 95),
    avg_seconds: Math.round(sum / sorted.length),
  };
}

export function summarizeSla(
  cases: readonly CaseRecord[],
  assignments: readonly Assignment[],
  now: Date = new Date(),
): SlaMetrics {
  // Earliest assignment per case → time-to-first-assignment.
  const firstAssignedAt = new Map<string, number>();
  for (const a of assignments) {
    const at = a.assignedAt.getTime();
    const prev = firstAssignedAt.get(a.caseId);
    if (prev === undefined || at < prev) firstAssignedAt.set(a.caseId, at);
  }

  const durationsByRisk: Record<RiskKey, number[]> = {
    riesgo_alto: [],
    riesgo_moderado: [],
    seguimiento: [],
  };
  let pendientes = 0;
  let riesgoAltoPendientes = 0;
  let slaVencidos = 0;
  let asignados = 0;
  let cerrados = 0;

  for (const c of cases) {
    const key = RISK_KEY[c.riskLevel as RiskLevel] ?? 'seguimiento';
    const assignedAt = firstAssignedAt.get(c.id);
    if (assignedAt !== undefined) {
      asignados += 1;
      const seconds = Math.max(0, Math.round((assignedAt - c.createdAt.getTime()) / 1000));
      durationsByRisk[key].push(seconds);
    }
    if (c.status === 'CLOSED') cerrados += 1;
    if (c.status === 'PENDING') {
      pendientes += 1;
      if (c.riskLevel === RiskLevel.HIGH) riesgoAltoPendientes += 1;
    }
    // SLA breach: high-risk case still awaiting acceptance past its deadline.
    if (
      c.riskLevel === RiskLevel.HIGH &&
      (c.status === 'PENDING' || c.status === 'ASSIGNED') &&
      c.slaExpiresAt !== undefined &&
      c.slaExpiresAt.getTime() < now.getTime()
    ) {
      slaVencidos += 1;
    }
  }

  return {
    tiempo_asignacion: {
      riesgo_alto: statsOf(durationsByRisk.riesgo_alto),
      riesgo_moderado: statsOf(durationsByRisk.riesgo_moderado),
      seguimiento: statsOf(durationsByRisk.seguimiento),
    },
    cola: { pendientes, riesgo_alto_pendientes: riesgoAltoPendientes, sla_vencidos: slaVencidos },
    totales: { casos: cases.length, asignados, cerrados },
  };
}
