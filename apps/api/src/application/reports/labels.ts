/**
 * Human labels for the closed-case report (issue #169).
 *
 * The database stores codes (`riesgo_alto`, `escucha_activa`, `indirecta_nino`). Those are
 * right for a machine and wrong for the audience: this report is read by psychologists and
 * by the Federation, so every coded column is rendered as the wording they already know
 * from the app.
 *
 * The labels mirror the catalogues the intake and closure forms use
 * (`apps/web/src/features/intake/tag-catalog.ts` and
 * `apps/web/src/features/psychologist-portal/closure-catalog.ts`) so the report says the
 * same thing the professional read when filling the form. They are duplicated rather than
 * imported because the two apps are separate workspaces; `humanize` keeps an unmapped code
 * readable, so the report degrades gracefully if a catalogue grows before this file does.
 */

const RISK: Record<string, string> = {
  riesgo_alto: 'Riesgo alto',
  riesgo_moderado: 'Riesgo moderado',
  seguimiento: 'Seguimiento',
};

const BRANCH: Record<string, string> = {
  roja: 'Rama roja (riesgo alto)',
  verde: 'Rama verde',
};

const REQUESTER: Record<string, string> = {
  victima: 'La propia persona afectada',
  familiar: 'Un familiar',
  voluntario: 'Un voluntario',
};

const MODALITY: Record<string, string> = {
  presencial: 'Presencial',
  distancia: 'A distancia',
};

const CONTACT_METHOD: Record<string, string> = {
  whatsapp: 'WhatsApp',
  llamada: 'Llamada telefónica',
};

const HABIT_CHANGES: Record<string, string> = {
  alimentacion: 'Alimentación',
  concentracion: 'Concentración',
  aseo: 'Aseo personal',
  relaciones: 'Relaciones',
  sueno: 'Sueño',
};

/** Requester-facing wording of the intake screener (first person, as they read it). */
const INTAKE_TAGS: Record<string, string> = {
  suicidal_ideation: 'Siento que la vida no vale la pena',
  self_harm_urge: 'Tengo ganas de hacerme daño físico',
  psychotic_symptoms: 'Escucho o veo cosas que otros no',
  acute_paranoia: 'Siento que me persiguen para dañarme',
  dissociation: 'No siento mi cuerpo / no sé quién soy',
  panic_death_fear: 'Siento que me voy a morir o a volverme loco/a',
  panic_somatic: 'No puedo respirar y me duele el pecho',
  freeze_response: 'Mi cuerpo tiembla sin control o siento parálisis',
  traumatic_grief: 'Acabo de perder a un ser querido en el sismo',
  survivor_guilt: 'Siento mucha culpa por haber sobrevivido',
  child_mutism: 'Tengo un niño/a que se quedó mudo/a o no reacciona',
  child_dysregulation: 'El menor a mi cargo llora o tiembla sin parar',
  persistent_crying: 'Tengo un llanto que no puedo detener',
  emotional_numbness: 'No siento nada, estoy vacío/a por dentro',
  complicated_grief: 'No logro aceptar la pérdida y me cuesta despedirme',
  child_psychoeducation: 'No sé cómo explicarle la tragedia al niño/a',
  child_sleep_regression: 'El niño/a tiene pesadillas, terror o regresiones',
  hypervigilance: 'Tengo pánico de que vuelva a temblar',
  material_loss: 'Perdí mi casa, ropa o pertenencias',
  missing_relative: 'Busco a un familiar desaparecido',
  acute_insomnia: 'No he dormido nada desde el temblor',
  vegetative_symptoms: 'No tengo hambre y estoy muy cansado/a',
};

const NO_CONTACT_REASONS: Record<string, string> = {
  abandono: 'Abandono (no respondió tras 3 intentos)',
  problemas_conexion: 'Problemas de conexión',
  solo_primer_contacto: 'Respuesta solo al primer contacto',
  solicitud_tercero: 'Solicitud de un tercero, no del consultante',
};

const SEXES: Record<string, string> = {
  femenino: 'Femenino',
  masculino: 'Masculino',
  lgbtq: 'LGBTQ+',
  no_binario: 'No binario',
};

/** Who received the care (RF-4.2.3). */
const RECIPIENTS: Record<string, string> = {
  directa: 'Atención directa (la persona afectada)',
  indirecta_nino: 'Atención indirecta (a través de un adulto, por un menor)',
  indirecta_adulto: 'Atención indirecta (a través de otro adulto)',
};

const CLOSURE_SYMPTOMS: Record<string, string> = {
  ansiedad_estres_agudo: 'Ansiedad / estrés agudo',
  episodio_depresivo: 'Episodio depresivo / bajo ánimo',
  duelo: 'Duelo (pérdida / migración)',
  ideacion_suicida: 'Ideación suicida / autolesión',
  crisis_psicotica_aguda: 'Crisis psicótica aguda',
  conflictos_familiares: 'Conflictos familiares / pareja',
  insomnio: 'Insomnio / problemas del sueño',
};

const CONTACT_MEDIUMS: Record<string, string> = {
  celular: 'Telefonía móvil',
  whatsapp: 'WhatsApp',
  linea_fija: 'Llamada de voz (línea fija)',
};

const TECHNIQUES: Record<string, string> = {
  pap: 'Primeros Auxilios Psicológicos (PAP)',
  ae: 'Atención en Emergencia (AE)',
  tol: 'Terapia de Objetivos Limitados (TOL)',
  psicoeducacion: 'Psicoeducación',
};

const CLOSE_REASONS: Record<string, string> = {
  finalizado: 'Proceso finalizado (objetivos cumplidos)',
  cierre_personal: 'El solicitante pide el cierre',
  referido_externo: 'Referido a especialista externo',
  psicoterapia_prolongada: 'Necesita psicoterapia prolongada',
  otro_voluntario: 'Atención por otro voluntario',
  // Administrative closes performed by a coordinator (RF-2.3).
  estancado: 'Cierre administrativo: caso estancado',
  duplicado: 'Cierre administrativo: caso duplicado',
  resuelto_externamente: 'Cierre administrativo: resuelto por fuera',
  solicitud_tercero: 'Cierre administrativo: solicitud de un tercero',
  otro: 'Cierre administrativo: otro motivo',
};

const REFERRAL_TYPES: Record<string, string> = {
  ninguna: 'Sin derivación',
  urgente: 'Urgente (atención inmediata)',
  seguimiento: 'Seguimiento posterior',
};

const REFERRAL_DESTINATIONS: Record<string, string> = {
  psicologia: 'Psicología',
  psiquiatria: 'Psiquiatría',
  medicina: 'Medicina',
  proteccion_ninos: 'Protección de niños',
  proteccion_mujer: 'Protección de la mujer',
};

/** `solo_primer_contacto` -> `Solo primer contacto`. Last resort for an unmapped code. */
export function humanize(code: string): string {
  const spaced = code.replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function label(map: Record<string, string>, code: string | null): string | null {
  if (!code) return null;
  return map[code] ?? humanize(code);
}

function labelAll(map: Record<string, string>, codes: string[]): string[] {
  return codes.map((code) => map[code] ?? humanize(code));
}

export const reportLabel = {
  risk: (c: string): string => label(RISK, c) ?? c,
  branch: (c: string): string => label(BRANCH, c) ?? c,
  requesterType: (c: string | null): string | null => label(REQUESTER, c),
  modality: (c: string | null): string | null => label(MODALITY, c),
  contactMethod: (c: string | null): string | null => label(CONTACT_METHOD, c),
  habitChanges: (c: string[]): string[] => labelAll(HABIT_CHANGES, c),
  intakeTags: (c: string[]): string[] => labelAll(INTAKE_TAGS, c),
  noContactReason: (c: string | null): string | null => label(NO_CONTACT_REASONS, c),
  sex: (c: string | null): string | null => label(SEXES, c),
  recipient: (c: string | null): string | null => label(RECIPIENTS, c),
  symptoms: (c: string[]): string[] => labelAll(CLOSURE_SYMPTOMS, c),
  contactMedium: (c: string | null): string | null => label(CONTACT_MEDIUMS, c),
  techniques: (c: string[]): string[] => labelAll(TECHNIQUES, c),
  closeReason: (c: string | null): string | null => label(CLOSE_REASONS, c),
  referralType: (c: string | null): string | null => label(REFERRAL_TYPES, c),
  referralDestinations: (c: string[]): string[] => labelAll(REFERRAL_DESTINATIONS, c),
};
