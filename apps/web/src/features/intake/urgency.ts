/**
 * Initial urgency question (Paso 0, "¿Cómo te sientes en este momento?"). The
 * requester's answer (1 = crisis … 5 = preventive) routes triage and is now
 * persisted so the assigned psychologist can review it (#131). Shared by the
 * intake screen and the psychologist's case detail so the labels never diverge.
 */
export const URGENCY_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 1, label: 'Estoy en crisis / en peligro ahora' },
  { value: 2, label: 'Muy mal, necesito ayuda pronto' },
  { value: 3, label: 'Regular, me cuesta el día a día' },
  { value: 4, label: 'Algo afectado, pero sobrellevo' },
  { value: 5, label: 'Quiero acompañamiento preventivo' },
];

export function urgencyLabel(value: number): string {
  return URGENCY_OPTIONS.find((o) => o.value === value)?.label ?? `Nivel ${value}`;
}
