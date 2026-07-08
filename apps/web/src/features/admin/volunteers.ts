import type { ExceptionReason, VolunteerStatus, VolunteerView } from '../../lib/types';

/** Human-readable explanation of each registration exception reason (RF-2.2). */
export const EXCEPTION_REASON: Record<ExceptionReason, string> = {
  fpv_unreachable: 'API FPV no respondió (timeout)',
  fpv_not_found: 'Cédula no encontrada en el padrón FPV',
  pap_not_declared: 'No declaró formación en PAP',
};

export function exceptionLabel(reason: ExceptionReason | null): string {
  return reason ? EXCEPTION_REASON[reason] : 'Validación automática no superada';
}

export interface StatusStyle {
  label: string;
  badge: string;
}

export const STATUS_STYLE: Record<VolunteerStatus, StatusStyle> = {
  active: { label: 'Activo', badge: 'bg-teal-100 text-teal-700' },
  pending_approval: { label: 'Pendiente', badge: 'bg-amber-100 text-amber-700' },
  inactive: { label: 'Inactivo', badge: 'bg-slate-100 text-slate-500' },
};

/**
 * Share of registrations that were validated automatically (active vs. the ones
 * that fell into manual review). Returns null when there is nothing to measure.
 */
export function autoValidationRate(volunteers: VolunteerView[]): number | null {
  const psychologists = volunteers.filter((v) => v.rol === 'psychologist');
  const active = psychologists.filter((v) => v.estado === 'active').length;
  const pending = psychologists.filter((v) => v.estado === 'pending_approval').length;
  const total = active + pending;
  if (total === 0) return null;
  return Math.round((active / total) * 100);
}

/** Two-letter initials from a person's name for the avatar. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '');
  return initials.toUpperCase() || '··';
}

/** Filters a roster by free-text (name, FPV id, email, specialty) and status. */
export function filterVolunteers(
  volunteers: VolunteerView[],
  search: string,
  status: VolunteerStatus | 'all',
): VolunteerView[] {
  const q = search.trim().toLowerCase();
  return volunteers.filter((v) => {
    if (status !== 'all' && v.estado !== status) return false;
    if (!q) return true;
    return [v.nombre, v.cedula_profesional, v.email, v.especialidad]
      .filter((x): x is string => typeof x === 'string')
      .join(' ')
      .toLowerCase()
      .includes(q);
  });
}
