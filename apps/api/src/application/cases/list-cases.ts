import { riskRank, type RiskLevel } from '../../domain/triage';
import type { CaseContact, CaseRecord } from '../../domain/case/case';
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

/** A psychologist's assigned case paired with its requester contact (PII). */
export interface AssignedCaseView {
  case: CaseRecord;
  contact: CaseContact | null;
}

/**
 * Assigned cases enriched with the requester contact. The assigned psychologist
 * is authorized to see this PII for their own cases (PRD §2.1, same scope as the
 * case detail), so the portal can list and search by name/phone. Coordinators and
 * admins never go through here — their list (`listAllCases`) stays PII-free.
 */
export async function listAssignedCasesDetailed(
  volunteerId: string,
  deps: CaseDeps,
): Promise<AssignedCaseView[]> {
  const cases = await listAssignedCases(volunteerId, deps);
  return Promise.all(
    cases.map(async (c) => ({
      case: c,
      contact: await deps.contacts.findByPseudonymId(c.pseudonymId),
    })),
  );
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
