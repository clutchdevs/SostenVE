/**
 * Clinical tag severity (Value Object).
 *
 * Domain values are in English (see CONTRIBUTING.md). Mapping to the Spanish
 * wire values (`rojo`/`naranja`/`amarillo`) happens at the interface layer.
 */
export const Severity = Object.freeze({
  RED: 'RED',
  ORANGE: 'ORANGE',
  YELLOW: 'YELLOW',
} as const);

export type Severity = (typeof Severity)[keyof typeof Severity];

export const ALL_SEVERITIES: readonly Severity[] = Object.freeze([
  Severity.RED,
  Severity.ORANGE,
  Severity.YELLOW,
]);

export function isSeverity(value: unknown): value is Severity {
  return typeof value === 'string' && value in Severity;
}
