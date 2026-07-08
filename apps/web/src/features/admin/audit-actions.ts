/**
 * Human-readable translation of audit `action_type` values. The raw method-like
 * code is kept immutable in the log (ADR-0012); this dictionary is a UI-only
 * layer so non-technical admins can read the audit table. Action types may carry
 * a `:detail` suffix (e.g. `volunteer_registered:active`).
 */
export type ActionTone = 'positive' | 'negative' | 'clinical' | 'neutral';

interface ActionMeta {
  label: string;
  tone: ActionTone;
}

const ACTIONS: Record<string, ActionMeta> = {
  volunteer_registered: { label: 'Registro de psicólogo', tone: 'neutral' },
  consent_accepted: { label: 'Consentimiento informado aceptado', tone: 'neutral' },
  volunteer_approved: { label: 'Psicólogo aprobado', tone: 'positive' },
  volunteer_rejected: { label: 'Registro rechazado', tone: 'negative' },
  coordinator_invited: { label: 'Coordinador invitado', tone: 'neutral' },
  coordinator_invitation_accepted: { label: 'Invitación de coordinador aceptada', tone: 'positive' },
  coordinator_invitation_revoked: { label: 'Invitación de coordinador revocada', tone: 'negative' },
  crisis_line_created: { label: 'Línea de crisis creada', tone: 'positive' },
  crisis_line_updated: { label: 'Línea de crisis actualizada', tone: 'neutral' },
  crisis_line_deleted: { label: 'Línea de crisis desactivada', tone: 'negative' },
  password_changed: { label: 'Contraseña cambiada', tone: 'neutral' },
  password_reset_requested: { label: 'Recuperación de contraseña solicitada', tone: 'neutral' },
  password_reset: { label: 'Contraseña restablecida', tone: 'positive' },
  clinical_note_read: { label: 'Lectura de nota clínica', tone: 'clinical' },
  case_closed: { label: 'Caso cerrado', tone: 'clinical' },
  acute_psychotic_crisis_referral: { label: 'Derivación por crisis psicótica aguda', tone: 'clinical' },
  suicidal_followup_flag: { label: 'Alerta de seguimiento por ideación suicida', tone: 'clinical' },
};

// Known `:detail` suffixes translated to friendly text.
const DETAILS: Record<string, Record<string, string>> = {
  volunteer_registered: { active: 'Activado', pending_approval: 'En revisión' },
};

function humanize(code: string): string {
  const text = code.replace(/[_:]/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface DescribedAction {
  label: string;
  /** Extra context shown as a small chip (e.g. the registration outcome). */
  detail?: string;
  tone: ActionTone;
  /** The raw action_type, kept for the tooltip / advanced filtering. */
  raw: string;
}

export function describeAction(accion: string): DescribedAction {
  const [base, ...rest] = accion.split(':');
  const suffix = rest.join(':');
  const meta = ACTIONS[base ?? ''];
  const detail = suffix ? (DETAILS[base ?? '']?.[suffix] ?? suffix) : undefined;
  return {
    label: meta?.label ?? humanize(base ?? accion),
    detail,
    tone: meta?.tone ?? 'neutral',
    raw: accion,
  };
}

export const ACTION_TONE_CLASS: Record<ActionTone, string> = {
  positive: 'bg-teal-100 text-teal-700',
  negative: 'bg-red-100 text-red-700',
  clinical: 'bg-amber-100 text-amber-700',
  neutral: 'bg-slate-100 text-slate-600',
};

const ROLE_LABEL: Record<string, string> = {
  psychologist: 'Psicólogo/a',
  coordinator: 'Coordinador/a',
  admin: 'Administrador/a',
  requester: 'Solicitante',
};

export function roleLabel(role: string | null): string {
  if (!role) return 'Sistema';
  return ROLE_LABEL[role] ?? role;
}
