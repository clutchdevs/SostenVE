/**
 * Label maps for the clinical closure form (Module 4, RF-4.2). Codes match the
 * backend `caseClosureSchema`; labels are Spanish for the psychologist.
 */
export interface Option {
  code: string;
  label: string;
}

export const NO_CONTACT_REASONS: Option[] = [
  { code: 'abandono', label: 'Abandono (no respondió tras 3 intentos)' },
  { code: 'problemas_conexion', label: 'Problemas de conexión' },
  { code: 'solo_primer_contacto', label: 'Respuesta solo al primer contacto' },
  { code: 'solicitud_tercero', label: 'Solicitud de un tercero, no del consultante' },
];

export const SEXES: Option[] = [
  { code: 'femenino', label: 'Femenino' },
  { code: 'masculino', label: 'Masculino' },
  { code: 'lgbtq', label: 'LGBTQ+' },
  { code: 'no_binario', label: 'No binario' },
];

export const SYMPTOMS: Option[] = [
  { code: 'ansiedad_estres_agudo', label: 'Ansiedad / estrés agudo' },
  { code: 'episodio_depresivo', label: 'Episodio depresivo / bajo ánimo' },
  { code: 'duelo', label: 'Duelo (pérdida / migración)' },
  { code: 'ideacion_suicida', label: 'Ideación suicida / autolesión' },
  { code: 'crisis_psicotica_aguda', label: 'Crisis psicótica aguda' },
  { code: 'conflictos_familiares', label: 'Conflictos familiares / pareja' },
  { code: 'insomnio', label: 'Insomnio / problemas del sueño' },
];

export const CONTACT_MEDIUMS: Option[] = [
  { code: 'celular', label: 'Telefonía móvil' },
  { code: 'whatsapp', label: 'WhatsApp' },
  { code: 'linea_fija', label: 'Llamada de voz (línea fija)' },
];

export const TECHNIQUES: Option[] = [
  { code: 'pap', label: 'Primeros Auxilios Psicológicos (PAP)' },
  { code: 'ae', label: 'Atención en Emergencia (AE)' },
  { code: 'tol', label: 'Terapia de Objetivos Limitados (TOL)' },
  { code: 'psicoeducacion', label: 'Psicoeducación' },
];

export const CLOSE_REASONS: Option[] = [
  { code: 'finalizado', label: 'Proceso finalizado (objetivos cumplidos)' },
  { code: 'cierre_personal', label: 'El solicitante pide el cierre' },
  { code: 'referido_externo', label: 'Referido a especialista externo' },
  { code: 'psicoterapia_prolongada', label: 'Necesita psicoterapia prolongada' },
  { code: 'otro_voluntario', label: 'Atención por otro voluntario' },
];

export const REFERRAL_TYPES: Option[] = [
  { code: 'ninguna', label: 'Sin derivación' },
  { code: 'urgente', label: 'Urgente (atención inmediata)' },
  { code: 'seguimiento', label: 'Seguimiento posterior' },
];

export const REFERRAL_DESTINATIONS: Option[] = [
  { code: 'psicologia', label: 'Psicología' },
  { code: 'psiquiatria', label: 'Psiquiatría' },
  { code: 'ambos', label: 'Psicología y Psiquiatría' },
  { code: 'medicina', label: 'Medicina' },
  { code: 'proteccion_ninos', label: 'Protección de niños' },
  { code: 'proteccion_mujer', label: 'Protección de la mujer' },
];

export function labelOf(options: Option[], code: string | null | undefined): string {
  if (!code) return '—';
  return options.find((o) => o.code === code)?.label ?? code;
}
