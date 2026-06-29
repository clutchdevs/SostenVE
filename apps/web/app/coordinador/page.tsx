'use client';

import { useEffect, useState } from 'react';
import { CaseList } from '../../src/features/shared/case-list';
import { AuthRequired } from '../../src/components/auth-required';
import { apiFetch, ApiError } from '../../src/lib/api-client';
import type { Capacity, CaseSummary } from '../../src/lib/types';

export default function CoordinatorPanel() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const [list, cap] = await Promise.all([
          apiFetch<CaseSummary[]>('/cases'),
          apiFetch<Capacity>('/coordinator/capacity'),
        ]);
        if (active) {
          setCases(list);
          setCapacity(cap);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setNeedsAuth(true);
        } else {
          setError('No se pudieron cargar los datos. Intenta de nuevo.');
        }
      }
    }
    void refresh();
    const timer = setInterval(refresh, 15_000); // near real-time via polling
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (needsAuth) {
    return <AuthRequired />;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold text-brand">Panel de coordinación</h1>
      {error && <p className="mt-4 text-risk-high">{error}</p>}

      {capacity && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-risk-high bg-red-50 p-3">
            <p className="text-2xl font-bold text-risk-high">{capacity.riesgo_alto_sin_atender}</p>
            <p className="text-sm">Riesgo alto sin atender</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-2xl font-bold">{capacity.casos_sin_asignar}</p>
            <p className="text-sm">Sin asignar</p>
          </div>
        </div>
      )}

      <div className="mt-6">
        <CaseList cases={cases} />
      </div>
    </main>
  );
}
