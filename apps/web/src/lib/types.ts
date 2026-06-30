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
  edad?: number | null;
  creado_en: string;
  sla_vence_en: string | null;
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
  rol: string | null;
  registro_afectado: string | null;
  accion: string;
  creado_en: string;
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
