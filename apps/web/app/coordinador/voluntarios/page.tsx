'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { AuthRequired } from '../../../src/components/auth-required';
import { ListSkeleton } from '../../../src/components/skeleton';
import { VolunteerCard } from '../../../src/features/coordinator/volunteer-card';
import { filterVolunteers } from '../../../src/features/admin/volunteers';
import { apiFetch, ApiError } from '../../../src/lib/api-client';
import { DATA_REFRESH_INTERVAL_MS } from '../../../src/lib/config';
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
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      setRoster(await apiFetch<VolunteerView[]>('/volunteers?status=all'));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
      else setError('No se pudo cargar el listado de voluntarios.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll only while filtering by "Disponibles ahora" (issue #130): presence changes
  // over time, so a live availability view must refresh — but when that filter is
  // off, the one-time load is enough and there is nothing time-sensitive to re-fetch.
  useEffect(() => {
    if (!onlineOnly) return;
    const timer = setInterval(() => void load(), DATA_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [onlineOnly, load]);

  const results = useMemo(
    () =>
      filterVolunteers(roster, search, status)
        .filter((v) => v.rol === 'psychologist')
        // "Disponibles ahora" (issue #130): only psychologists online right now, so
        // the coordinator can spot who can take a case without scrolling the roster.
        .filter((v) => (onlineOnly ? v.en_linea === true : true)),
    [roster, search, status, onlineOnly],
  );

  // Any filter departing from the default view (all statuses, no search, not gated
  // by availability) enables the "Limpiar filtros" reset — same as padrón/invitaciones.
  const isFiltered = search !== '' || status !== 'all' || onlineOnly;
  function clearFilters() {
    setSearch('');
    setStatus('all');
    setOnlineOnly(false);
  }

  if (needsAuth) return <AuthRequired />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-ink">Voluntarios</h1>
        <p className="mt-1 text-sm text-slate-600">
          Aprueba, suspende y registra notas confidenciales sobre los psicólogos voluntarios.
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
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
            <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
            <button
              type="button"
              onClick={() => setOnlineOnly((v) => !v)}
              aria-pressed={onlineOnly}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                onlineOnly
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  onlineOnly ? 'bg-white' : 'bg-emerald-500'
                }`}
                aria-hidden
              />
              Disponibles ahora
              {onlineOnly && <span className="text-xs font-normal opacity-90">· en vivo</span>}
            </button>
          </div>
          {isFiltered && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" aria-hidden />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-risk-high">
          {error}
        </p>
      )}

      <section className="space-y-3">
        {loaded && (
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {results.length} {results.length === 1 ? 'voluntario' : 'voluntarios'}
          </p>
        )}
        {!loaded ? (
          <ListSkeleton rows={5} />
        ) : (
          <>
            {results.map((v) => (
              <VolunteerCard key={v.id} volunteer={v} onChange={load} />
            ))}
            {results.length === 0 && !error && (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-surface-card/60 px-6 py-12 text-center text-sm text-slate-500">
                No hay voluntarios que coincidan.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
