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

export interface Capacity {
  casos_sin_asignar: number;
  riesgo_alto_sin_atender: number;
  en_cola_por_categoria: Record<string, number>;
}
