import { ApiError } from '../../shared/errors/api-error';
import { RiskLevel } from '../../domain/triage';
import type { AppConfig } from '../../config';
import type { AssignmentRepository } from '../../domain/assignment/assignment';
import type { AuditLogRepository } from '../../domain/audit/audit';
import type { CaseRepository } from '../../domain/case/case';
import type { VolunteerRepository } from '../../domain/volunteer/volunteer';
import type { AssignmentNotifier } from '../assignment/ports';

/** Who performed the coordinator action (recorded in the audit log). */
export interface CoordinatorActor {
  id: string;
  role: string;
}

export interface ReassignCaseDeps {
  cases: CaseRepository;
  assignments: AssignmentRepository;
  volunteers: VolunteerRepository;
  notifier: AssignmentNotifier;
  audit: AuditLogRepository;
  config: AppConfig;
}

/**
 * Coordinator manually reassigns a case to a specific active psychologist
 * (RF-2.3). Revokes any existing assignment, assigns the chosen volunteer, moves
 * the case to `asignado` and — for high-risk cases — resets the acceptance SLA so
 * the new assignee gets a full window (otherwise the cron would re-escalate it
 * instantly). Notifies the volunteer and audits the action.
 */
export async function reassignCase(
  caseId: string,
  volunteerId: string,
  actor: CoordinatorActor,
  deps: ReassignCaseDeps,
  now: Date = new Date(),
): Promise<void> {
  const caseRecord = await deps.cases.findById(caseId);
  if (!caseRecord) throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  if (caseRecord.status === 'CLOSED') {
    throw new ApiError(409, 'INVALID_STATE', 'A closed case cannot be reassigned');
  }

  const volunteer = await deps.volunteers.findById(volunteerId);
  if (!volunteer || volunteer.role !== 'psychologist' || volunteer.status !== 'active') {
    throw new ApiError(400, 'INVALID_TARGET', 'Target must be an active psychologist');
  }

  await deps.assignments.deleteByCaseId(caseId);
  await deps.assignments.create({ caseId, volunteerId });
  await deps.cases.updateStatus(caseId, 'ASSIGNED');

  if (caseRecord.riskLevel === RiskLevel.HIGH) {
    const slaMs = deps.config.sla.high_risk_assignment_minutes * 60_000;
    await deps.cases.updateSlaExpiresAt(caseId, new Date(now.getTime() + slaMs));
  }

  await deps.notifier.notifyAssigned({ volunteerId, caseId });
  await deps.audit.append({
    userId: actor.id,
    role: actor.role,
    affectedRecordId: caseId,
    actionType: 'case_reassigned',
  });
}

export interface CoordinatorCloseDeps {
  cases: CaseRepository;
  assignments: AssignmentRepository;
  audit: AuditLogRepository;
}

/**
 * Coordinator administratively closes a stalled/pending case (RF-2.3). This is
 * distinct from the psychologist's clinical closure: it does not record a
 * clinical closure form, only marks the case `cerrado`, revokes any assignment
 * and audits the reason. Idempotency: a closed case cannot be closed again.
 */
export async function coordinatorCloseCase(
  caseId: string,
  reason: string,
  actor: CoordinatorActor,
  deps: CoordinatorCloseDeps,
): Promise<void> {
  const caseRecord = await deps.cases.findById(caseId);
  if (!caseRecord) throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  if (caseRecord.status === 'CLOSED') {
    throw new ApiError(409, 'INVALID_STATE', 'Case is already closed');
  }

  await deps.assignments.deleteByCaseId(caseId);
  await deps.cases.updateSlaExpiresAt(caseId, null);
  await deps.cases.updateStatus(caseId, 'CLOSED');
  await deps.audit.append({
    userId: actor.id,
    role: actor.role,
    affectedRecordId: caseId,
    actionType: `case_closed_by_coordinator:${reason}`,
  });
}
