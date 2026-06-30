import {
  branchToDb,
  modalityToDb,
  requesterToDb,
  riskToDb,
  statusToDb,
} from '../../../infrastructure/repositories/enum-maps';
import type { ActiveCrisisLine } from '../../../application/intake/crisis-line-routing';
import type { IntakeCaseResult } from '../../../application/intake/types';
import type { AuditEntryRecord } from '../../../domain/audit/audit';
import type { CaseContact, CaseRecord } from '../../../domain/case/case';
import type { ClinicalNote } from '../../../domain/clinical/clinical-note';
import type { CaseClosure } from '../../../domain/clinical/case-closure';
import type { CrisisLine } from '../../../domain/crisis-line/crisis-line';
import type { CoordinatorInvitation } from '../../../domain/coordinator/invitation';

/** Maps domain results to the Spanish contract values (see openapi.yaml). */

export function presentCrisisLines(lines: ActiveCrisisLine) {
  return { activa: lines.active, respaldo: lines.backups };
}

export function presentCrisisLineAdmin(line: CrisisLine) {
  return {
    id: line.id,
    nombre: line.name,
    telefono: line.phone,
    cobertura: line.coverage ?? null,
    hora_inicio: line.startHour ?? null,
    hora_fin: line.endHour ?? null,
    prioridad: line.priority,
    activa: line.active,
  };
}

export function presentInvitation(invitation: CoordinatorInvitation) {
  return {
    id: invitation.id,
    nombre: invitation.fullName,
    email: invitation.email,
    estado: invitation.status,
    vence_en: invitation.expiresAt.toISOString(),
    aceptada_en: invitation.acceptedAt?.toISOString() ?? null,
    creada_en: invitation.createdAt.toISOString(),
  };
}

export function presentAuditEntry(entry: AuditEntryRecord) {
  return {
    id: entry.id,
    usuario_id: entry.userId,
    rol: entry.role,
    registro_afectado: entry.affectedRecordId,
    accion: entry.actionType,
    creado_en: entry.createdAt.toISOString(),
  };
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

export function presentCaseContact(contact: CaseContact | null) {
  if (!contact) return null;
  return { nombre: contact.name ?? null, contacto: contact.contact };
}

export function presentCaseClosure(closure: CaseClosure | null) {
  if (!closure) return null;
  return {
    contacto: closure.contacted,
    motivo_no_contacto: closure.noContactReason ?? null,
    sexo: closure.sex ?? null,
    destinatario: closure.recipient ?? null,
    sintomas: closure.symptoms,
    otro_sintoma: closure.otherSymptom ?? null,
    medio_contacto: closure.contactMedium ?? null,
    tecnicas: closure.techniques,
    motivo_cierre: closure.closeReason ?? null,
    derivacion_tipo: closure.referralType ?? null,
    derivacion_destino: closure.referralDestination ?? null,
    horas: closure.hours,
    comentario: closure.comment ?? null,
    creada_en: closure.createdAt.toISOString(),
  };
}
