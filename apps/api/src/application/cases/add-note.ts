import { assertCanDiagnoseTept } from '../../domain/clinical/tept-rule';
import { ReferralType, resolveReferral, type ReferralDecision } from '../../domain/clinical/acute-psychotic-crisis';
import { RiskLevel } from '../../domain/triage';
import type { ClinicalNote } from '../../domain/clinical/clinical-note';
import { assertOwnership } from './get-case';
import type { CaseDeps } from './ports';

export interface AddNoteInput {
  diagnosis?: string;
  content: string;
  /** Whether this note records a PTSD (TEPT) diagnosis — gated by RF-4.3. */
  teptDiagnosis?: boolean;
  /** Whether an acute psychotic crisis is present — triggers RF-4.2.9. */
  acutePsychoticCrisis?: boolean;
  requestedReferral?: ReferralType;
}

export interface AddNoteResult {
  note: ClinicalNote;
  referral: ReferralDecision;
}

/**
 * Registers a clinical note for an assigned case, enforcing the safety rules:
 * - RF-4.3: a PTSD diagnosis is blocked before `tept_diagnosis_block_days` days
 *   from the event date.
 * - RF-4.2.9: an acute psychotic crisis forces an URGENT, locked referral, raises
 *   the case to high risk (coordinator visibility) and is audited.
 */
export async function addClinicalNote(
  caseId: string,
  volunteerId: string,
  input: AddNoteInput,
  deps: CaseDeps,
): Promise<AddNoteResult> {
  await assertOwnership(caseId, volunteerId, deps);

  if (input.teptDiagnosis) {
    assertCanDiagnoseTept(
      new Date(deps.config.clinical_records.event_date),
      new Date(),
      deps.config.clinical_records.tept_diagnosis_block_days,
    );
  }

  const referral = resolveReferral({
    hasAcutePsychoticCrisis: input.acutePsychoticCrisis ?? false,
    requested: input.requestedReferral ?? ReferralType.ROUTINE,
  });

  const note = await deps.notes.create({
    caseId,
    authorVolunteerId: volunteerId,
    diagnosis: input.diagnosis,
    content: input.content,
  });

  if (referral.locked) {
    // Acute psychotic crisis: surface to coordinators and audit.
    await deps.cases.updateRiskLevel(caseId, RiskLevel.HIGH);
    await deps.audit.append({
      userId: volunteerId,
      role: 'psychologist',
      affectedRecordId: caseId,
      actionType: 'acute_psychotic_crisis_referral',
    });
  }

  return { note, referral };
}
