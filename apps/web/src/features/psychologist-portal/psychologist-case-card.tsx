'use client';

import { ChevronRight, Clock, MapPin, Phone, UserRound } from 'lucide-react';
import type { CaseSummary } from '../../lib/types';
import {
  caseDescription,
  caseInitials,
  contactMethod,
  displayName,
  priorityStyle,
} from './caseload';

interface Props {
  caso: CaseSummary;
  onOpen: (caseId: string) => void;
  now?: Date;
}

/** Minutes left until the acceptance SLA, or null when not applicable. */
function slaMinutesLeft(c: CaseSummary, now: Date): number | null {
  if (c.estado !== 'asignado' || !c.sla_vence_en) return null;
  return Math.round((new Date(c.sla_vence_en).getTime() - now.getTime()) / 60_000);
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Patient case as a card (replaces the table row) for the psychologist
 * dashboard. The left accent border and badge encode the priority; the CTA
 * adapts to the case state. Patient identity is intentionally not shown here —
 * it appears only on the case detail for the assigned psychologist.
 */
export function PsychologistCaseCard({ caso, onOpen, now = new Date() }: Props) {
  const priority = priorityStyle(caso.nivel_riesgo);
  const minutesLeft = slaMinutesLeft(caso, now);
  const isNew = caso.estado === 'asignado';
  const isHigh = caso.nivel_riesgo === 'riesgo_alto';

  const cta = ctaFor(caso.estado);
  const danger = isNew && isHigh;

  return (
    <article
      className={`flex items-stretch justify-between gap-4 rounded-2xl border border-slate-200/80 border-l-4 bg-surface-card p-4 shadow-card transition-shadow hover:shadow-md ${priority.leftBorder}`}
    >
      <div className="flex min-w-0 gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-navy">
          {caseInitials(caso)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-ink">{displayName(caso)}</h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${priority.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} aria-hidden />
              {priority.label}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5" aria-hidden />
              {caso.edad != null ? `${caso.edad} años` : 'Edad N/D'}
            </span>
            <span className="inline-flex items-center gap-1">
              {caso.modalidad === 'presencial' ? (
                <MapPin className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Phone className="h-3.5 w-3.5" aria-hidden />
              )}
              {contactMethod(caso)}
            </span>
            {caso.contacto && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {caso.contacto}
              </span>
            )}
          </div>

          <p className="mt-1.5 truncate text-sm text-slate-600">{caseDescription(caso)}</p>

          {minutesLeft != null && (
            <p
              className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                minutesLeft <= 0 ? 'text-risk-high' : 'text-accent-orange'
              }`}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {minutesLeft <= 0 ? 'SLA vencido' : `Acepta en ${minutesLeft} min`}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between">
        <time className="text-xs text-slate-400">{formatTimestamp(caso.creado_en)}</time>
        <button
          type="button"
          onClick={() => onOpen(caso.caso_id)}
          className={`mt-3 inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
            cta.variant === 'primary'
              ? danger
                ? 'bg-accent-danger text-white hover:opacity-90'
                : 'bg-navy text-white hover:bg-navy-hover'
              : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {cta.label}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </article>
  );
}

function ctaFor(estado: string): { label: string; variant: 'primary' | 'ghost' } {
  switch (estado) {
    case 'asignado':
      return { label: 'Aceptar', variant: 'primary' };
    case 'aceptado':
      return { label: 'Continuar', variant: 'primary' };
    case 'cerrado':
      return { label: 'Ver cierre', variant: 'ghost' };
    default:
      return { label: 'Ver', variant: 'ghost' };
  }
}
