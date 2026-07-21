import type { AuditLogRepository } from '../../domain/audit/audit.js';

/**
 * Closed-case report (issue #169, ADR-0017).
 *
 * The report reproduces the clinical closure EXACTLY as it was stored — no field is
 * filtered out, including the free-text comment. That is a Federation decision: they
 * own this data and asked to see it as recorded. What stays out are the requester's
 * structured identity fields (name/phone), which live in a separate table and remain
 * restricted to the assigned psychologist (ADR-0011, issue #25).
 */

/** Filters the coordinator can combine. All optional except pagination. */
export interface ClosedCaseFilters {
  /** Closed on/after this instant. */
  from?: Date;
  /** Closed on/before this instant. */
  to?: Date;
  riskLevel?: string;
  /** Psychologist who closed the case. */
  volunteerId?: string;
  closeReason?: string;
  referralType?: string;
  limit: number;
  offset: number;
}

/** One row of the report: the case's operational data plus its closure, as stored. */
export interface ClosedCaseReportRow {
  // --- Case ---
  casoId: string;
  rama: string;
  nivelRiesgo: string;
  scoreUrgencia: number;
  tipoSolicitante: string | null;
  zona: string | null;
  modalidad: string | null;
  metodoContacto: string | null;
  edad: number | null;
  sintomasIntake: string[];
  cambioHabitos: string[];
  urgenciaRespuesta: number | null;
  creadoEn: string;
  // --- Closure (verbatim) ---
  cerradoEn: string;
  psicologo: string | null;
  contacto: boolean;
  motivoNoContacto: string | null;
  sexo: string | null;
  destinatario: string | null;
  sintomas: string[];
  otroSintoma: string | null;
  medioContacto: string | null;
  tecnicas: string[];
  motivoCierre: string | null;
  derivacionTipo: string | null;
  derivacionDestinos: string[];
  minutos: number;
  comentario: string | null;
}

export interface ClosedCaseReportPage {
  rows: ClosedCaseReportRow[];
  /** Total matching the filters, ignoring pagination (for the UI and the audit trail). */
  total: number;
}

export interface ClosedCaseReportRepository {
  list(filters: ClosedCaseFilters): Promise<ClosedCaseReportPage>;
}

export interface ReportDeps {
  reports: ClosedCaseReportRepository;
  audit: AuditLogRepository;
}
