import { Severity } from './severity';
import { createSymptomTag, type SymptomTag } from './symptom-tag';

/**
 * PROVISIONAL clinical tag catalog.
 *
 * TODO — Human-in-the-Loop (ADR-0010): the exact tag set and their weights must
 * be validated by an FPV psychologist. The classification engine does NOT depend
 * on these concrete codes (it operates on severity and weight), so replacing this
 * catalog later does not change the engine.
 *
 * Default weights encode a sensible clinical ordering (RED >> ORANGE >> YELLOW)
 * for the weighted urgency index; final values are also pending FPV validation.
 */
export const DEFAULT_SEVERITY_WEIGHT: Readonly<Record<Severity, number>> = Object.freeze({
  [Severity.RED]: 100,
  [Severity.ORANGE]: 10,
  [Severity.YELLOW]: 1,
});

interface CatalogEntry {
  code: string;
  severity: Severity;
}

// Representative, provisional entries — NOT the final FPV list.
const PROVISIONAL_ENTRIES: readonly CatalogEntry[] = [
  { code: 'suicidal_ideation', severity: Severity.RED },
  { code: 'psychotic_symptoms', severity: Severity.RED },
  { code: 'panic_attacks', severity: Severity.ORANGE },
  { code: 'severe_insomnia', severity: Severity.ORANGE },
  { code: 'intrusive_memories', severity: Severity.ORANGE },
  { code: 'persistent_sadness', severity: Severity.YELLOW },
  { code: 'social_withdrawal', severity: Severity.YELLOW },
];

export const PROVISIONAL_TAG_CATALOG: ReadonlyMap<string, SymptomTag> = new Map(
  PROVISIONAL_ENTRIES.map((entry) => [
    entry.code,
    createSymptomTag({
      code: entry.code,
      severity: entry.severity,
      weight: DEFAULT_SEVERITY_WEIGHT[entry.severity],
    }),
  ]),
);

export function getProvisionalTag(code: string): SymptomTag | undefined {
  return PROVISIONAL_TAG_CATALOG.get(code);
}
