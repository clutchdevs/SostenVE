import { summarizeSla, type SlaMetrics } from './sla-metrics';
import type { AssignmentRepository } from '../../domain/assignment/assignment';
import type { CaseRepository } from '../../domain/case/case';

export interface MetricsDeps {
  cases: CaseRepository;
  assignments: AssignmentRepository;
}

export interface Metrics extends SlaMetrics {
  generated_at: string;
  /** Process uptime of the responding instance (serverless: since cold start). */
  uptime_seconds: number;
}

/**
 * Collects the monitoring snapshot (fase 06): SLA/queue metrics over all cases
 * plus the responding instance's uptime. Reads all cases and their assignments
 * (batched) and delegates the math to the pure `summarizeSla`.
 */
export async function collectMetrics(
  deps: MetricsDeps,
  now: Date = new Date(),
): Promise<Metrics> {
  const cases = await deps.cases.listAll();
  const assignments = await deps.assignments.findByCaseIds(cases.map((c) => c.id));
  const sla = summarizeSla(cases, assignments, now);
  return {
    generated_at: now.toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    ...sla,
  };
}
