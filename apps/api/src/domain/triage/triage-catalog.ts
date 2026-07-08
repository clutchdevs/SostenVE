import { Severity } from './severity.js';
import { createSymptomTag, type SymptomTag } from './symptom-tag.js';

/**
 * Clinical symptom-tag catalog — the real set from the FPV PRD (RF-1.3, "Pantalla
 * 4: Sintomatología con Tags"). Grouped in three clinical severity levels; the
 * classification engine and the weighted urgency index operate on severity and
 * weight, so the concrete codes here can evolve without changing the engine.
 *
 * Versioned: bump `TAG_CATALOG_VERSION` whenever the set changes. The tag set and
 * its per-tag weights/thresholds were validated by the FPV (2026-07-03, ADR-0010).
 */
export const TAG_CATALOG_VERSION = 'v1.0.0-fpv-prd-rf-1.3';

/** Default weight per severity (RED ≫ ORANGE ≫ YELLOW) for the urgency index. */
export const DEFAULT_SEVERITY_WEIGHT: Readonly<Record<Severity, number>> = Object.freeze({
  [Severity.RED]: 100,
  [Severity.ORANGE]: 10,
  [Severity.YELLOW]: 1,
});

export interface CatalogEntry {
  code: string;
  severity: Severity;
  /** Optional weight override; defaults to the severity weight. */
  weight?: number;
  /** PRD flags this tag to prioritise a child-specialist assignment (infancia). */
  childSpecialty?: boolean;
}

/**
 * The FPV clinical catalog (RF-1.3). Labels shown to the requester live in the
 * web mirror (`apps/web/src/features/intake/tag-catalog.ts`) sharing the same
 * codes and version; the backend re-resolves severity/weight server-side and
 * never trusts client-supplied values.
 */
const CLINICAL_TAG_ENTRIES: readonly CatalogEntry[] = [
  // NIVEL ROJO — riesgo vital, psicosis o disociación extrema.
  { code: 'suicidal_ideation', severity: Severity.RED },
  { code: 'self_harm_urge', severity: Severity.RED },
  { code: 'psychotic_symptoms', severity: Severity.RED },
  { code: 'acute_paranoia', severity: Severity.RED },
  { code: 'dissociation', severity: Severity.RED },

  // NIVEL NARANJA — crisis aguda, desborde somático, duelo traumático e infancia.
  { code: 'panic_death_fear', severity: Severity.ORANGE },
  { code: 'panic_somatic', severity: Severity.ORANGE },
  { code: 'freeze_response', severity: Severity.ORANGE },
  // PRD: "Incrementa peso de prioridad" — duelo agudo de alto impacto.
  { code: 'traumatic_grief', severity: Severity.ORANGE, weight: 20 },
  // PRD: "Factor severo de riesgo depresivo" — culpa del superviviente.
  { code: 'survivor_guilt', severity: Severity.ORANGE, weight: 15 },
  { code: 'child_mutism', severity: Severity.ORANGE, childSpecialty: true },
  { code: 'child_dysregulation', severity: Severity.ORANGE, childSpecialty: true },
  { code: 'persistent_crying', severity: Severity.ORANGE },
  { code: 'emotional_numbness', severity: Severity.ORANGE },

  // NIVEL AMARILLO — estrés agudo adaptativo, procesamiento de pérdidas, menores.
  { code: 'complicated_grief', severity: Severity.YELLOW },
  { code: 'child_psychoeducation', severity: Severity.YELLOW, childSpecialty: true },
  { code: 'child_sleep_regression', severity: Severity.YELLOW, childSpecialty: true },
  { code: 'hypervigilance', severity: Severity.YELLOW },
  { code: 'material_loss', severity: Severity.YELLOW },
  { code: 'missing_relative', severity: Severity.YELLOW },
  { code: 'acute_insomnia', severity: Severity.YELLOW },
  { code: 'vegetative_symptoms', severity: Severity.YELLOW },
];

export const CLINICAL_TAG_CATALOG: ReadonlyMap<string, SymptomTag> = new Map(
  CLINICAL_TAG_ENTRIES.map((entry) => [
    entry.code,
    createSymptomTag({
      code: entry.code,
      severity: entry.severity,
      weight: entry.weight ?? DEFAULT_SEVERITY_WEIGHT[entry.severity],
    }),
  ]),
);

/** Catalog entries with their metadata (severity + child-specialty flag). */
export const CLINICAL_TAG_ENTRY_LIST: readonly CatalogEntry[] = CLINICAL_TAG_ENTRIES;

export function getCatalogTag(code: string): SymptomTag | undefined {
  return CLINICAL_TAG_CATALOG.get(code);
}

/** Tag codes the PRD flags as "Infancia" (prioritise a child specialist, RF-1.3). */
const CHILD_SPECIALTY_TAG_CODES: ReadonlySet<string> = new Set(
  CLINICAL_TAG_ENTRIES.filter((entry) => entry.childSpecialty).map((entry) => entry.code),
);

/**
 * True if any of the selected tags is a childhood tag, so the case should be
 * routed to a psychologist with a child specialty (RF-1.3, "Enrutamiento por
 * Perfil de Especialidad"). Unknown codes are ignored (validated elsewhere).
 */
export function requiresChildSpecialty(codes: readonly string[]): boolean {
  return codes.some((code) => CHILD_SPECIALTY_TAG_CODES.has(code));
}
