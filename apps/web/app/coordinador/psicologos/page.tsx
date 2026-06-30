'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserRound } from 'lucide-react';
import { AuthRequired } from '../../../src/components/auth-required';
import { isLive } from '../../../src/features/coordinator/operations';
import { apiFetch, ApiError } from '../../../src/lib/api-client';
import type { CaseSummary } from '../../../src/lib/types';

interface Workload {
  nombre: string;
  activos: number;
  enCurso: number;
  riesgoAlto: number;
}

function initials(name: string): string {
  const parts = name.replace(/^(Dra?\.|Lic\.)\s*/i, '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '··';
}

export default function PsychologistsOnDutyPage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<CaseSummary[]>('/cases')
      .then(setCases)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
        else setError('No se pudieron cargar los casos.');
      });
  }, []);

  const workloads = useMemo<Workload[]>(() => {
    const byName = new Map<string, Workload>();
    for (const c of cases) {
      if (!isLive(c) || !c.asignado_a) continue;
      const w = byName.get(c.asignado_a) ?? { nombre: c.asignado_a, activos: 0, enCurso: 0, riesgoAlto: 0 };
      w.activos += 1;
      if (c.estado === 'aceptado') w.enCurso += 1;
      if (c.nivel_riesgo === 'riesgo_alto') w.riesgoAlto += 1;
      byName.set(c.asignado_a, w);
    }
    return [...byName.values()].sort((a, b) => b.activos - a.activos);
  }, [cases]);

  if (needsAuth) return <AuthRequired />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-ink">Psicólogos en atención</h1>
        <p className="mt-1 text-sm text-slate-600">
          {workloads.length} con casos activos asignados ahora mismo.
        </p>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-risk-high">
          {error}
        </p>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {workloads.map((w) => (
          <article
            key={w.nombre}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-surface-card p-4 shadow-card"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-navy">
                {initials(w.nombre)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-navy">{w.nombre}</p>
                <p className="text-xs text-slate-500">
                  {w.enCurso} en curso
                  {w.riesgoAlto > 0 && <span className="text-accent-coral"> · {w.riesgoAlto} riesgo alto</span>}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-sm font-semibold text-teal-700">
              {w.activos} {w.activos === 1 ? 'caso' : 'casos'}
            </span>
          </article>
        ))}
        {workloads.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-surface-card/60 px-6 py-14 text-center sm:col-span-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <UserRound className="h-6 w-6 text-slate-400" aria-hidden />
            </span>
            <p className="mt-3 font-medium text-ink">Nadie con casos activos</p>
            <p className="mt-1 text-sm text-slate-500">Los casos asignados aparecerán aquí por psicólogo.</p>
          </div>
        )}
      </section>
    </div>
  );
}
