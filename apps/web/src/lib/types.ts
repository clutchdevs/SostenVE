/** Shared wire types returned by the API (Spanish contract values). */
export interface CaseSummary {
  caso_id: string;
  rama: string;
  nivel_riesgo: string;
  score_urgencia: number;
  estado: string;
  tipo_solicitante?: string | null;
  zona?: string | null;
  modalidad?: string | null;
  /** Preferred contact channel (green-branch screen 2): whatsapp | llamada. */
  metodo_contacto?: string | null;
  edad?: number | null;
  /** Habit changes reported at intake (green-branch screen 5). */
  cambio_habitos?: string[];
  creado_en: string;
  sla_vence_en: string | null;
  // Requester contact (PII). Present only on the psychologist's own case list
  // and detail; never returned to coordinators/admins.
  nombre?: string | null;
  contacto?: string | null;
  // Assigned psychologist's name. Present only on the coordinator/admin board.
  asignado_a?: string | null;
}

export interface ClinicalNoteView {
  id: string;
  diagnostico: string | null;
  contenido: string;
  autor_id: string;
  creada_en: string;
}

export interface CaseContactView {
  nombre: string | null;
  contacto: string;
}

export interface CaseClosureView {
  contacto: boolean;
  motivo_no_contacto: string | null;
  sexo: string | null;
  destinatario: string | null;
  sintomas: string[];
  otro_sintoma: string | null;
  medio_contacto: string | null;
  tecnicas: string[];
  motivo_cierre: string | null;
  derivacion_tipo: string | null;
  derivacion_destino: string | null;
  horas: number;
  comentario: string | null;
  creada_en: string;
}

export interface Capacity {
  casos_sin_asignar: number;
  riesgo_alto_sin_atender: number;
  en_cola_por_categoria: Record<string, number>;
}

export interface CrisisLineAdmin {
  id: string;
  nombre: string;
  telefono: string;
  cobertura: string | null;
  hora_inicio: number | null;
  hora_fin: number | null;
  prioridad: number;
  activa: boolean;
}

export interface AuditEntryView {
  id: string;
  usuario_id: string | null;
  usuario_nombre: string | null;
  usuario_cedula: string | null;
  rol: string | null;
  registro_afectado: string | null;
  accion: string;
  creado_en: string;
}

/** Paginated audit response: total matching + the current page of items. */
export interface AuditPageView {
  total: number;
  items: AuditEntryView[];
}

export type VolunteerStatus = 'active' | 'pending_approval' | 'inactive';
export type ExceptionReason = 'fpv_unreachable' | 'fpv_not_found' | 'pap_not_declared';

export interface VolunteerView {
  id: string;
  nombre: string;
  cedula_profesional: string;
  email?: string | null;
  especialidad?: string | null;
  rol: string;
  /** All roles the account holds (#133); falls back to `[rol]` for old rows. */
  roles?: string[];
  estado: VolunteerStatus;
  /** Why it needs manual review; only set while pending_approval. */
  motivo_excepcion: ExceptionReason | null;
  /** Live presence for the coordinator console (RF-2.5.4). */
  en_linea?: boolean;
  creado_en: string;
}

/** Full applicant record for the review view (RF-2.3), from GET /volunteers/:id. */
export interface VolunteerDetailView extends VolunteerView {
  telefono?: string | null;
  documento?: string | null;
  universidad?: string | null;
  anio_egreso?: number | null;
  colegio?: string | null;
  pais_residencia?: string | null;
  ciudad_residencia?: string | null;
  modalidad?: string[];
  disponibilidad_horaria?: { dia: string; bloque: string }[];
  pap?: boolean | null;
  pap_detalle?: string | null;
  consentimiento_version?: string | null;
  consentimiento_aceptado_en?: string | null;
}

/** Confidential coordinator note about a volunteer (RF-2.4). */
export interface VolunteerNoteView {
  id: string;
  voluntario_id: string;
  autor_id: string | null;
  contenido: string;
  creada_en: string;
}

export interface CoordinatorInvitationView {
  id: string;
  nombre: string;
  email: string;
  estado: 'pending' | 'accepted' | 'revoked';
  vence_en: string;
  aceptada_en: string | null;
  creada_en: string;
}

/** Create response also carries the raw token, shown once to the admin. */
export interface CoordinatorInvitationCreated extends CoordinatorInvitationView {
  token: string;
}
