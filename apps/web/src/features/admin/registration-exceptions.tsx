'use client';

import { AlertTriangle, BadgeCheck, Check } from 'lucide-react';
import type { VolunteerView } from '../../lib/types';
import { exceptionLabel, initialsOf } from './volunteers';

interface Props {
  exceptions: VolunteerView[];
  busyId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

/** Stacked exception cards with approve/reject actions (RF-2.2 manual review). */
export function RegistrationExceptions({ exceptions, busyId, onApprove, onReject }: Props) {
  if (exceptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-surface-card/60 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
          <BadgeCheck className="h-6 w-6 text-accent-green" aria-hidden />
        </span>
        <p className="mt-3 font-medium text-ink">Sin excepciones pendientes</p>
        <p className="mt-1 text-sm text-slate-500">
          Todos los registros recientes se validaron automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exceptions.map((v) => {
        const busy = busyId === v.id;
        return (
          <article
            key={v.id}
            className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200/80 border-l-4 border-l-accent-amber bg-surface-card p-4 shadow-card"
          >
            <div className="flex min-w-0 gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-navy">
                {initialsOf(v.nombre)}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-navy">{v.nombre}</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Pendiente
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {[v.cedula_profesional, v.especialidad].filter(Boolean).join(' · ')}
                  {v.email ? ` · ${v.email}` : ''}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-risk-high">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  {exceptionLabel(v.motivo_excepcion)}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onApprove(v.id)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent-green px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Check className="h-4 w-4" aria-hidden />
                Aprobar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onReject(v.id)}
                className="inline-flex items-center justify-center rounded-xl border border-accent-coral px-4 py-2 text-sm font-semibold text-accent-coral transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
