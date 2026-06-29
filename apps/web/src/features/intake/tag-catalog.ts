/**
 * Client mirror of the provisional clinical tag catalog (labels in Spanish for
 * the requester). Severities match the backend catalog; the backend re-resolves
 * weights server-side, so this is presentation only. Pending FPV validation.
 */
export type TagSeverity = 'red' | 'orange' | 'yellow';

export interface TagOption {
  code: string;
  label: string;
  severity: TagSeverity;
}

export const TAG_CATALOG: readonly TagOption[] = [
  { code: 'suicidal_ideation', label: 'Pensamientos de hacerme daño', severity: 'red' },
  { code: 'psychotic_symptoms', label: 'Veo/oigo cosas que otros no perciben', severity: 'red' },
  { code: 'panic_attacks', label: 'Ataques de pánico', severity: 'orange' },
  { code: 'severe_insomnia', label: 'Insomnio severo', severity: 'orange' },
  { code: 'intrusive_memories', label: 'Recuerdos intrusivos', severity: 'orange' },
  { code: 'persistent_sadness', label: 'Tristeza persistente', severity: 'yellow' },
  { code: 'social_withdrawal', label: 'Aislamiento social', severity: 'yellow' },
];
