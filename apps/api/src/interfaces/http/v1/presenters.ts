import {
  branchToDb,
  modalityToDb,
  requesterToDb,
  riskToDb,
  statusToDb,
} from '../../../infrastructure/repositories/enum-maps';
import type { ActiveCrisisLine } from '../../../application/intake/crisis-line-routing';
import type { IntakeCaseResult } from '../../../application/intake/types';
import type { CaseRecord } from '../../../domain/case/case';
import type { ClinicalNote } from '../../../domain/clinical/clinical-note';

/** Maps domain results to the Spanish contract values (see openapi.yaml). */

export function presentCrisisLines(lines: ActiveCrisisLine) {
  return { activa: lines.active, respaldo: lines.backups };
}

export function presentIntakeResult(result: IntakeCaseResult) {
  return {
    caso_id: result.caseId,
    rama: branchToDb[result.branch],
    nivel_riesgo: riskToDb[result.riskLevel],
    score_urgencia: result.urgencyScore,
    lineas_crisis: result.crisisLines ? presentCrisisLines(result.crisisLines) : undefined,
  };
}

export function presentCaseSummary(caseRecord: CaseRecord) {
  return {
    caso_id: caseRecord.id,
    rama: branchToDb[caseRecord.branch],
    nivel_riesgo: riskToDb[caseRecord.riskLevel],
    score_urgencia: caseRecord.urgencyScore,
    estado: statusToDb[caseRecord.status],
    tipo_solicitante: caseRecord.requesterType ? requesterToDb[caseRecord.requesterType] : null,
    zona: caseRecord.zone ?? null,
    modalidad: caseRecord.preferredModality ? modalityToDb[caseRecord.preferredModality] : null,
    edad: caseRecord.age ?? null,
    creado_en: caseRecord.createdAt.toISOString(),
    sla_vence_en: caseRecord.slaExpiresAt?.toISOString() ?? null,
  };
}

export function presentNote(note: ClinicalNote) {
  return {
    id: note.id,
    diagnostico: note.diagnosis ?? null,
    contenido: note.content,
    autor_id: note.authorVolunteerId,
    creada_en: note.createdAt.toISOString(),
  };
}
