'use client';

import type { CaseSummary } from '../../lib/types';
import {
  caseCode,
  caseDescriptor,
  requesterLabel,
  slaState,
  statusLabel,
  type SlaTone,
} from './operations';

interface Props {
  cases: CaseSummary[];
  now: Date;
}

const RISK: Record<string, { label: string; badge: string }> = {
  riesgo_alto: { label: 'Alto', badge: 'bg-red-100 text-red-700' },
  riesgo_moderado: { label: 'Moderado', badge: 'bg-amber-100 text-amber-700' },
  seguimiento: { label: 'Seguimiento', badge: 'bg-teal-100 text-teal-700' },
};

const SLA_TONE: Record<SlaTone, string> = {
  expired: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  healthy: 'bg-teal-100 text-teal-700',
  waiting: 'bg-slate-100 text-slate-500',
};

/** Mission-control table of the live case queue (fast visual scanning). */
export function CaseQueueTable({ cases, now }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-surface-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-semibold">Caso</th>
              <th className="px-5 py-3 font-semibold">Riesgo</th>
              <th className="px-5 py-3 font-semibold">Asignado a</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 font-semibold">SLA</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const risk = RISK[c.nivel_riesgo] ?? { label: c.nivel_riesgo, badge: 'bg-slate-100 text-slate-600' };
              const sla = slaState(c, now);
              return (
                <tr key={c.caso_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-navy">{requesterLabel(c)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="font-mono">{caseCode(c)}</span> · {caseDescriptor(c)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${risk.badge}`}>
                      {risk.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {c.asignado_a ? (
                      <span className="font-medium text-navy">{c.asignado_a}</span>
                    ) : (
                      <span className="font-medium text-accent-coral">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{statusLabel(c.estado)}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SLA_TONE[sla.tone]}`}>
                      {sla.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {cases.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                  No hay casos activos en la cola.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
