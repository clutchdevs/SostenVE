/**
 * Client mirror of the clinical tag catalog — the real FPV set (PRD RF-1.3).
 * Codes, severities and version match the backend catalog
 * (`apps/api/src/domain/triage/triage-catalog.ts`); the backend re-resolves the
 * weights server-side, so this is presentation only (the Spanish labels shown to
 * the requester). Bump `TAG_CATALOG_VERSION` in sync with the backend.
 */
export const TAG_CATALOG_VERSION = 'v1.0.0-fpv-prd-rf-1.3';

export type TagSeverity = 'red' | 'orange' | 'yellow';

export interface TagOption {
  code: string;
  label: string;
  severity: TagSeverity;
  /** Flags an infancia tag (prioritises a child-specialist assignment). */
  childSpecialty?: boolean;
}

export const TAG_CATALOG: readonly TagOption[] = [
  // Nivel rojo — riesgo vital, psicosis o disociación extrema.
  { code: 'suicidal_ideation', label: 'Siento que la vida no vale la pena', severity: 'red' },
  { code: 'self_harm_urge', label: 'Tengo ganas de hacerme daño físico', severity: 'red' },
  { code: 'psychotic_symptoms', label: 'Escucho o veo cosas que otros no', severity: 'red' },
  { code: 'acute_paranoia', label: 'Siento que me persiguen para dañarme', severity: 'red' },
  { code: 'dissociation', label: 'No siento mi cuerpo / no sé quién soy', severity: 'red' },

  // Nivel naranja — crisis aguda, desborde somático, duelo traumático e infancia.
  { code: 'panic_death_fear', label: 'Siento que me voy a morir o a volverme loco/a', severity: 'orange' },
  { code: 'panic_somatic', label: 'No puedo respirar y me duele el pecho', severity: 'orange' },
  { code: 'freeze_response', label: 'Mi cuerpo tiembla sin control o siento parálisis', severity: 'orange' },
  { code: 'traumatic_grief', label: 'Acabo de perder a un ser querido en el sismo', severity: 'orange' },
  { code: 'survivor_guilt', label: 'Siento mucha culpa por haber sobrevivido', severity: 'orange' },
  { code: 'child_mutism', label: 'Tengo un niño/a que se quedó mudo/a o no reacciona', severity: 'orange', childSpecialty: true },
  { code: 'child_dysregulation', label: 'El menor a mi cargo llora o tiembla sin parar', severity: 'orange', childSpecialty: true },
  { code: 'persistent_crying', label: 'Tengo un llanto que no puedo detener', severity: 'orange' },
  { code: 'emotional_numbness', label: 'No siento nada, estoy vacío/a por dentro', severity: 'orange' },

  // Nivel amarillo — estrés agudo adaptativo, procesamiento de pérdidas, menores.
  { code: 'complicated_grief', label: 'No logro aceptar la pérdida y me cuesta despedirme', severity: 'yellow' },
  { code: 'child_psychoeducation', label: 'No sé cómo explicarle la tragedia al niño/a', severity: 'yellow', childSpecialty: true },
  { code: 'child_sleep_regression', label: 'El niño/a tiene pesadillas, terror o regresiones', severity: 'yellow', childSpecialty: true },
  { code: 'hypervigilance', label: 'Tengo pánico de que vuelva a temblar', severity: 'yellow' },
  { code: 'material_loss', label: 'Perdí mi casa, ropa o pertenencias', severity: 'yellow' },
  { code: 'missing_relative', label: 'Busco a un familiar desaparecido', severity: 'yellow' },
  { code: 'acute_insomnia', label: 'No he dormido nada desde el temblor', severity: 'yellow' },
  { code: 'vegetative_symptoms', label: 'No tengo hambre y estoy muy cansado/a', severity: 'yellow' },
];
