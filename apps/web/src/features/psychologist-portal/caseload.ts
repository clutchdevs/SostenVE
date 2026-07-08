import type { CaseSummary } from '../../lib/types';

/** Time-of-day greeting in es-VE (no name is available client-side). */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export interface CaseloadSummary {
  /** Assigned, awaiting the psychologist's acceptance (SLA running). */
  nuevos: number;
  /** Accepted and being worked. */
  enCurso: number;
  /** Closed within the current calendar month. */
  atendidosMes: number;
}

/** Aggregates the KPI counts shown at the top of the dashboard. */
export function summarizeCaseload(cases: CaseSummary[], now: Date = new Date()): CaseloadSummary {
  let nuevos = 0;
  let enCurso = 0;
  let atendidosMes = 0;
  for (const c of cases) {
    if (c.estado === 'asignado') nuevos += 1;
    else if (c.estado === 'aceptado') enCurso += 1;
    else if (c.estado === 'cerrado' && isSameMonth(new Date(c.creado_en), now)) atendidosMes += 1;
  }
  return { nuevos, enCurso, atendidosMes };
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export type PriorityKey = 'riesgo_alto' | 'riesgo_moderado' | 'seguimiento';

export interface PriorityStyle {
  label: string;
  /** Soft badge (high-contrast text on a tint). */
  badge: string;
  /** Thick left accent border color. */
  leftBorder: string;
  dot: string;
}

const FALLBACK: PriorityStyle = {
  label: 'Sin clasificar',
  badge: 'bg-slate-100 text-slate-600',
  leftBorder: 'border-l-slate-300',
  dot: 'bg-slate-400',
};

const PRIORITY: Record<PriorityKey, PriorityStyle> = {
  riesgo_alto: {
    label: 'Alta',
    badge: 'bg-red-100 text-red-700',
    leftBorder: 'border-l-risk-high',
    dot: 'bg-risk-high',
  },
  riesgo_moderado: {
    label: 'Moderada',
    badge: 'bg-amber-100 text-amber-700',
    leftBorder: 'border-l-risk-moderate',
    dot: 'bg-risk-moderate',
  },
  seguimiento: {
    label: 'Seguimiento',
    badge: 'bg-teal-100 text-teal-700',
    leftBorder: 'border-l-risk-followup',
    dot: 'bg-risk-followup',
  },
};

export function priorityStyle(nivelRiesgo: string): PriorityStyle {
  return PRIORITY[nivelRiesgo as PriorityKey] ?? FALLBACK;
}

/** Short pseudonymous label; used when the requester name is not available. */
export function caseLabel(c: CaseSummary): string {
  return `Caso ${c.caso_id.slice(0, 4).toUpperCase()}`;
}

/** Human title for the card: the requester name if known, else the case label. */
export function displayName(c: CaseSummary): string {
  return c.nombre?.trim() ? c.nombre.trim() : caseLabel(c);
}

/** Two-letter avatar initials from the requester name, falling back to the id. */
export function caseInitials(c: CaseSummary): string {
  const name = c.nombre?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const initials = (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '');
    if (initials) return initials.toUpperCase();
  }
  return c.caso_id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '··';
}

const MODALIDAD_LABEL: Record<string, string> = {
  presencial: 'Presencial',
  distancia: 'A distancia',
};

export function contactMethod(c: CaseSummary): string {
  return c.modalidad ? (MODALIDAD_LABEL[c.modalidad] ?? c.modalidad) : 'Sin definir';
}

const RAMA_LABEL: Record<string, string> = { roja: 'Rama roja', verde: 'Rama verde' };

/** One-line human description from the non-PII fields we have in the list. */
export function caseDescription(c: CaseSummary): string {
  const rama = RAMA_LABEL[c.rama] ?? c.rama;
  return c.zona ? `${rama} · ${c.zona}` : rama;
}

/** Cases the psychologist still has to act on, most urgent first. */
export function sortByUrgency(cases: CaseSummary[]): CaseSummary[] {
  const rank: Record<string, number> = { riesgo_alto: 0, riesgo_moderado: 1, seguimiento: 2 };
  return [...cases].sort((a, b) => {
    const byRisk = (rank[a.nivel_riesgo] ?? 9) - (rank[b.nivel_riesgo] ?? 9);
    if (byRisk !== 0) return byRisk;
    return new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime();
  });
}

export type RiskFilter = 'todas' | 'riesgo_alto' | 'riesgo_moderado' | 'seguimiento';
export type BranchFilter = 'todas' | 'roja' | 'verde';

export interface CaseFilters {
  search: string;
  risk: RiskFilter;
  branch: BranchFilter;
}

export const EMPTY_FILTERS: CaseFilters = { search: '', risk: 'todas', branch: 'todas' };

function matchesSearch(c: CaseSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [c.nombre, c.contacto, c.caso_id, c.zona]
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

/**
 * Applies the toolbar filters: free-text search over the requester name/phone
 * (and id/zone), the risk level and the intake branch. Pure so it is easy to test.
 */
export function filterCases(cases: CaseSummary[], filters: CaseFilters): CaseSummary[] {
  return cases.filter(
    (c) =>
      (filters.risk === 'todas' || c.nivel_riesgo === filters.risk) &&
      (filters.branch === 'todas' || c.rama === filters.branch) &&
      matchesSearch(c, filters.search),
  );
}
