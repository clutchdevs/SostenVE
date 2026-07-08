import { ApiError } from '../../shared/errors/api-error';
import type { RequesterType } from '../../domain/case/case';
import type { CaseClosure } from '../../domain/clinical/case-closure';
import { assertOwnership } from './get-case';
import type { CaseDeps } from './ports';

export interface CaseClosureInput {
  contacted: boolean;
  noContactReason?: string;
  sex?: string;
  symptoms?: string[];
  otherSymptom?: string;
  contactMedium?: string;
  techniques?: string[];
  closeReason?: string;
  referralType?: string;
  referralDestination?: string;
  hours: number;
  comment?: string;
}

/** Suicidal-ideation symptom code (RF-4.2.4) → triggers a follow-up alert. */
const SUICIDAL_SYMPTOM = 'ideacion_suicida';

/** Derives the help recipient (RF-4.2.3) from intake data. */
function deriveRecipient(requesterType: RequesterType | undefined, age: number | undefined): string {
  if (requesterType === 'VICTIM') return 'directa';
  return age !== undefined && age < 18 ? 'indirecta_nino' : 'indirecta_adulto';
}

/**
 * Records the structured clinical closure of a case (Module 4, RF-4.2) and closes
 * it. Only the assigned psychologist may close, and only from the `aceptado`
 * state — a case is closed once and cannot be reopened/retaken.
 */
export async function recordCaseClosure(
  caseId: string,
  volunteerId: string,
  input: CaseClosureInput,
  deps: CaseDeps,
): Promise<CaseClosure> {
  await assertOwnership(caseId, volunteerId, deps);

  const caseRecord = await deps.cases.findById(caseId);
  if (!caseRecord) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }
  if (caseRecord.status !== 'ACCEPTED') {
    throw new ApiError(409, 'INVALID_STATE', 'Only an accepted case can be closed');
  }
  if (await deps.closures.findByCaseId(caseId)) {
    throw new ApiError(409, 'ALREADY_CLOSED', 'Case already has a closure record');
  }

  const closure = await deps.closures.create({
    caseId,
    authorVolunteerId: volunteerId,
    contacted: input.contacted,
    noContactReason: input.noContactReason,
    sex: input.sex,
    recipient: deriveRecipient(caseRecord.requesterType, caseRecord.age),
    symptoms: input.symptoms ?? [],
    otherSymptom: input.otherSymptom,
    contactMedium: input.contactMedium,
    techniques: input.techniques ?? [],
    closeReason: input.closeReason,
    referralType: input.referralType,
    referralDestination: input.referralDestination,
    hours: input.hours,
    comment: input.comment,
  });

  await deps.cases.updateStatus(caseId, 'CLOSED');

  await deps.audit.append({
    userId: volunteerId,
    role: 'psychologist',
    affectedRecordId: caseId,
    actionType: 'case_closed',
  });

  if ((input.symptoms ?? []).includes(SUICIDAL_SYMPTOM)) {
    // Preventive follow-up alert for the coordinators (RF-4.2.4).
    await deps.audit.append({
      userId: volunteerId,
      role: 'psychologist',
      affectedRecordId: caseId,
      actionType: 'suicidal_followup_flag',
    });
  }

  return closure;
}
