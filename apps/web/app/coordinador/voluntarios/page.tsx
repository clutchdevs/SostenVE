'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AuthRequired } from '../../../src/components/auth-required';
import { VolunteerCard } from '../../../src/features/coordinator/volunteer-card';
import { filterVolunteers } from '../../../src/features/admin/volunteers';
import { apiFetch, ApiError } from '../../../src/lib/api-client';
import type { VolunteerStatus, VolunteerView } from '../../../src/lib/types';

const STATUS_TABS: { key: VolunteerStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'pending_approval', label: 'Pendientes' },
  { key: 'inactive', label: 'Suspendidos' },
];

export default function CoordinatorVolunteersPage() {
  const [roster, setRoster] = useState<VolunteerView[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<VolunteerStatus | 'all'>('all');
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setRoster(await apiFetch<VolunteerView[]>('/volunteers?status=all'));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
      else setError('No se pudo cargar el listado de voluntarios.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const results = useMemo(
    () => filterVolunteers(roster, search, status).filter((v) => v.rol === 'psychologist'),
    [roster, search, status],
  );

  if (needsAuth) return <AuthRequired />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-ink">Voluntarios</h1>
        <p className="mt-1 text-sm text-slate-600">
          Aprueba, suspende y registra notas confidenciales sobre los psicólogos voluntarios (RF-2.3 / RF-2.4).
        </p>
      </header>

      <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-surface-card p-4 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, FPV, correo o especialidad…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
            aria-label="Buscar voluntarios"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                tab.key === status
                  ? 'border-navy bg-navy text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-risk-high">
          {error}
        </p>
      )}

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {results.length} {results.length === 1 ? 'voluntario' : 'voluntarios'}
        </p>
        {results.map((v) => (
          <VolunteerCard key={v.id} volunteer={v} onChange={load} />
        ))}
        {results.length === 0 && !error && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-surface-card/60 px-6 py-12 text-center text-sm text-slate-500">
            No hay voluntarios que coincidan.
          </p>
        )}
      </section>
    </div>
  );
}
