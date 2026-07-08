import { RiskLevel } from '../../domain/triage';
import type { CaseRepository } from '../../domain/case/case';

export interface CapacityDeps {
  cases: CaseRepository;
}

export interface CapacitySnapshot {
  casesUnassigned: number;
  highRiskUnattended: number;
  queuedByCategory: Record<string, number>;
}

/**
 * Real-time capacity for the coordinator panel: how many cases are waiting,
 * how many high-risk cases are still unattended, and the queue by risk level.
 */
export async function getCapacity(deps: CapacityDeps): Promise<CapacitySnapshot> {
  const pending = await deps.cases.listByStatus('PENDING');
  const assigned = await deps.cases.listByStatus('ASSIGNED');

  const queuedByCategory: Record<string, number> = {};
  for (const c of pending) {
    queuedByCategory[c.riskLevel] = (queuedByCategory[c.riskLevel] ?? 0) + 1;
  }

  // Unattended high risk = high-risk cases not yet accepted (pending or assigned).
  const highRiskUnattended = [...pending, ...assigned].filter(
    (c) => c.riskLevel === RiskLevel.HIGH,
  ).length;

  return {
    casesUnassigned: pending.length,
    highRiskUnattended,
    queuedByCategory,
  };
}
