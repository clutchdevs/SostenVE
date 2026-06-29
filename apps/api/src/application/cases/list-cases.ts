import { riskRank, type RiskLevel } from '../../domain/triage';
import type { CaseRecord } from '../../domain/case/case';
import type { CaseDeps } from './ports';

/** Cases assigned to a given volunteer (psychologist portal). */
export async function listAssignedCases(
  volunteerId: string,
  deps: CaseDeps,
): Promise<CaseRecord[]> {
  const assignments = await deps.assignments.findByVolunteerId(volunteerId);
  const cases = await Promise.all(assignments.map((a) => deps.cases.findById(a.caseId)));
  return cases.filter((c): c is CaseRecord => c !== null);
}

/** All cases for the coordinator, high risk first, then most recent. */
export async function listAllCases(deps: CaseDeps): Promise<CaseRecord[]> {
  const cases = await deps.cases.listAll();
  return [...cases].sort((a, b) => {
    const byRisk = riskRank(b.riskLevel as RiskLevel) - riskRank(a.riskLevel as RiskLevel);
    if (byRisk !== 0) return byRisk;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
