import { riskRank, type RiskLevel } from '../../domain/triage/index.js';
import type { AssignmentRepository } from '../../domain/assignment/assignment.js';
import type { CaseContact, CaseRecord } from '../../domain/case/case.js';
import type { VolunteerRepository } from '../../domain/volunteer/volunteer.js';
import type { CaseDeps } from './ports.js';

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

/** A case paired with the name of the psychologist it is assigned to (if any). */
export interface CoordinatorCaseView {
  case: CaseRecord;
  assigneeName: string | null;
}

export interface CoordinatorListDeps {
  cases: CaseDeps['cases'];
  assignments: AssignmentRepository;
  volunteers: VolunteerRepository;
}

/**
 * All cases for the coordinator board, enriched with the assigned psychologist's
 * name (operational data the coordinator is allowed to see; the requester stays
 * PII-free). Batched: one query for the assignments, then the distinct assignees.
 */
export async function listAllCasesDetailed(
  deps: CoordinatorListDeps,
): Promise<CoordinatorCaseView[]> {
  const cases = await listAllCases({ cases: deps.cases } as CaseDeps);
  const assignments = await deps.assignments.findByCaseIds(cases.map((c) => c.id));

  // Latest assignment per case (escalation deletes old ones, but be defensive).
  const latestByCase = new Map<string, { volunteerId: string; at: number }>();
  for (const a of assignments) {
    const prev = latestByCase.get(a.caseId);
    const at = a.assignedAt.getTime();
    if (!prev || at > prev.at) latestByCase.set(a.caseId, { volunteerId: a.volunteerId, at });
  }

  const assigneeIds = [...new Set([...latestByCase.values()].map((v) => v.volunteerId))];
  const assignees = await Promise.all(assigneeIds.map((id) => deps.volunteers.findById(id)));
  const nameById = new Map(
    assignees.filter((v) => v !== null).map((v) => [v.id, v.fullName] as const),
  );

  return cases.map((c) => {
    const assigned = latestByCase.get(c.id);
    return { case: c, assigneeName: assigned ? (nameById.get(assigned.volunteerId) ?? null) : null };
  });
}
