'use client';

import { useEffect, useState } from 'react';
import { AuthRequired } from '../../../src/components/auth-required';
import { apiFetch, ApiError } from '../../../src/lib/api-client';
import type { Capacity } from '../../../src/lib/types';

const CATEGORY: { key: string; label: string; bar: string }[] = [
  { key: 'HIGH', label: 'Riesgo alto', bar: 'bg-accent-coral' },
  { key: 'MODERATE', label: 'Riesgo moderado', bar: 'bg-accent-amber' },
  { key: 'FOLLOW_UP', label: 'Seguimiento', bar: 'bg-accent-teal' },
];

export default function ReportsPage() {
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Capacity>('/coordinator/capacity')
      .then(setCapacity)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
        else setError('No se pudieron cargar los reportes.');
      });
  }, []);

  if (needsAuth) return <AuthRequired />;

  const queue = capacity?.en_cola_por_categoria ?? {};
  const totalQueued = Object.values(queue).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-ink">Reportes</h1>
        <p className="mt-1 text-sm text-slate-600">Estado operativo de la cola en este momento.</p>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-risk-high">
          {error}
        </p>
      )}

      {capacity && (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat value={capacity.casos_sin_asignar} label="Sin asignar" className="text-accent-amber" />
            <Stat
              value={capacity.riesgo_alto_sin_atender}
              label="Riesgo alto sin atender"
              className="text-accent-coral"
            />
            <Stat value={totalQueued} label="Total en cola" className="text-navy" />
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface-card p-5 shadow-card">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              En cola por categoría
            </h2>
            <div className="mt-4 space-y-3">
              {CATEGORY.map((cat) => {
                const count = queue[cat.key] ?? 0;
                const pct = totalQueued ? Math.round((count / totalQueued) * 100) : 0;
                return (
                  <div key={cat.key}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{cat.label}</span>
                      <span className="font-semibold text-ink">{count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${cat.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {totalQueued === 0 && <p className="text-sm text-slate-500">No hay casos en cola.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ value, label, className }: { value: number; label: string; className: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-surface-card p-5 shadow-card">
      <p className={`text-4xl font-bold tabular-nums ${className}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
