'use client';

import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { AuditEntryView } from '../../lib/types';
import { ACTION_TONE_CLASS, describeAction, roleLabel } from './audit-actions';

interface Props {
  entries: AuditEntryView[];
  filter: string;
  onFilter: (value: string) => void;
  page: number;
  pageSize: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Paginated, human-readable viewer of the immutable audit log (admin). */
export function AuditViewer({ entries, filter, onFilter, page, pageSize, total, onPrev, onNext }: Props) {
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = page * pageSize + entries.length;
  const hasPrev = page > 0;
  const hasNext = to < total;

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink">Auditoría</h1>
        <p className="mt-1 text-sm text-slate-600">
          Registro inmutable de acciones (más recientes primero).
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
          placeholder="Filtrar por acción (p. ej. crisis_line_updated)"
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
          aria-label="Filtrar por acción"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-surface-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Fecha y hora</th>
                <th className="px-4 py-3 font-semibold">Acción</th>
                <th className="px-4 py-3 font-semibold">Usuario</th>
                <th className="px-4 py-3 font-semibold">Cédula</th>
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3 font-semibold">Registro afectado</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const action = describeAction(e.accion);
                return (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatWhen(e.creado_en)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ACTION_TONE_CLASS[action.tone]}`}
                          title={action.raw}
                        >
                          {action.label}
                        </span>
                        {action.detail && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            {action.detail}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{e.usuario_nombre ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                      {e.usuario_cedula ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{roleLabel(e.rol)}</td>
                    <td className="max-w-[14rem] truncate px-4 py-3 font-mono text-xs text-slate-400" title={e.registro_afectado ?? ''}>
                      {e.registro_afectado ?? '—'}
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Sin entradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
          <span>
            {total === 0 ? 'Sin registros' : `Mostrando ${from}–${to} de ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Anterior
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
