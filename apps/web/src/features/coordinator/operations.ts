import type { CaseSummary } from '../../lib/types';

/**
 * Pure helpers for the coordinator operations board. The requester stays
 * PII-free (coordinators never see the name), so cases are shown with a stable
 * pseudonymous label + a short code derived from the case id.
 */

/** Stable pseudonymous letter (A–Z) derived from the case id. */
function letterFor(id: string): string {
  let sum = 0;
  for (const ch of id) sum = (sum + ch.charCodeAt(0)) % 26;
  return String.fromCharCode(65 + sum);
}

export function requesterLabel(c: CaseSummary): string {
  return `Solicitante ${letterFor(c.caso_id)}.`;
}

/** Short operational code, e.g. C-4F2A. */
export function caseCode(c: CaseSummary): string {
  const compact = c.caso_id.replace(/[^a-zA-Z0-9]/g, '');
  return `C-${compact.slice(-4).toUpperCase()}`;
}

const BRANCH_LABEL: Record<string, string> = { roja: 'Rama roja', verde: 'Rama verde' };
const REQUESTER_LABEL: Record<string, string> = {
  victima: 'Víctima',
  familiar: 'Familiar',
  voluntario: 'Voluntario',
};

/** One-line descriptor from non-PII fields (branch · requester/zone). */
export function caseDescriptor(c: CaseSummary): string {
  const parts = [BRANCH_LABEL[c.rama] ?? c.rama];
  if (c.tipo_solicitante) parts.push(REQUESTER_LABEL[c.tipo_solicitante] ?? c.tipo_solicitante);
  else if (c.zona) parts.push(c.zona);
  return parts.join(' · ');
}

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'En cola',
  asignado: 'Asignado',
  aceptado: 'En curso',
  cerrado: 'Cerrado',
};

export function statusLabel(estado: string): string {
  return STATUS_LABEL[estado] ?? estado;
}

/** Live = anything not closed (the operations queue). */
export function isLive(c: CaseSummary): boolean {
  return c.estado !== 'cerrado';
}

export type SlaTone = 'expired' | 'warning' | 'healthy' | 'waiting';

export interface SlaState {
  label: string;
  tone: SlaTone;
}

const WARNING_MINUTES = 5;

/** SLA chip state for a case at a given moment. */
export function slaState(c: CaseSummary, now: Date = new Date()): SlaState {
  if (!c.sla_vence_en) return { label: 'En espera', tone: 'waiting' };
  const diffMin = Math.round((new Date(c.sla_vence_en).getTime() - now.getTime()) / 60_000);
  if (diffMin < 0) return { label: `Vencido +${Math.abs(diffMin)} min`, tone: 'expired' };
  if (diffMin <= WARNING_MINUTES) return { label: `${diffMin} min`, tone: 'warning' };
  return { label: 'OK', tone: 'healthy' };
}

export function isSlaExpired(c: CaseSummary, now: Date = new Date()): boolean {
  return slaState(c, now).tone === 'expired';
}

export interface OpsSummary {
  riesgoAlto: number;
  enCola: number;
  psicologos: number;
  /** Average wait (minutes) of cases still queued. */
  esperaPromedioMin: number;
  slaVencidos: number;
}

/** KPI roll-up over the live (non-closed) cases. */
export function summarizeOps(cases: CaseSummary[], now: Date = new Date()): OpsSummary {
  const live = cases.filter(isLive);
  const queued = live.filter((c) => c.estado === 'pendiente');
  const assignees = new Set(
    live.map((c) => c.asignado_a).filter((n): n is string => typeof n === 'string' && n.length > 0),
  );
  const waitMin = queued.map((c) => (now.getTime() - new Date(c.creado_en).getTime()) / 60_000);
  const avg = waitMin.length ? waitMin.reduce((a, b) => a + b, 0) / waitMin.length : 0;
  return {
    riesgoAlto: live.filter((c) => c.nivel_riesgo === 'riesgo_alto').length,
    enCola: queued.length,
    psicologos: assignees.size,
    esperaPromedioMin: Math.round(avg * 10) / 10,
    slaVencidos: live.filter((c) => isSlaExpired(c, now)).length,
  };
}

/** Live cases ordered for fast scanning: expired SLA first, then by risk, then oldest. */
export function sortForBoard(cases: CaseSummary[], now: Date = new Date()): CaseSummary[] {
  const riskRank: Record<string, number> = { riesgo_alto: 0, riesgo_moderado: 1, seguimiento: 2 };
  return cases.filter(isLive).sort((a, b) => {
    const byExpired = Number(isSlaExpired(b, now)) - Number(isSlaExpired(a, now));
    if (byExpired !== 0) return byExpired;
    const byRisk = (riskRank[a.nivel_riesgo] ?? 9) - (riskRank[b.nivel_riesgo] ?? 9);
    if (byRisk !== 0) return byRisk;
    return new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime();
  });
}
