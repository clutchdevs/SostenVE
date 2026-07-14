'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, SearchX, X } from 'lucide-react';
import { AuthRequired } from '../../../src/components/auth-required';
import { ListSkeleton } from '../../../src/components/skeleton';
import { Pagination } from '../../../src/components/pagination';
import {
  filterVolunteers,
  initialsOf,
  STATUS_STYLE,
} from '../../../src/features/admin/volunteers';
import { apiFetch, ApiError } from '../../../src/lib/api-client';
import type { VolunteerStatus, VolunteerView } from '../../../src/lib/types';

const STATUS_TABS: { key: VolunteerStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'pending_approval', label: 'Pendientes' },
  { key: 'inactive', label: 'Inactivos' },
];

const ROLE_LABEL: Record<string, string> = {
  psychologist: 'Psicólogo/a',
  coordinator: 'Coordinador/a',
  admin: 'Administrador/a',
};

const PAGE_SIZE = 20;

export default function PadronPage() {
  const [roster, setRoster] = useState<VolunteerView[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<VolunteerStatus | 'all'>('all');
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiFetch<VolunteerView[]>('/volunteers?status=all')
      .then(setRoster)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
        else setError('No se pudo cargar el padrón. Intenta de nuevo.');
      })
      .finally(() => setLoaded(true));
  }, []);

  const results = useMemo(
    () => filterVolunteers(roster, search, status),
    [roster, search, status],
  );

  // Reset to the first page whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filtersActive = search !== '' || status !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
  };

  if (needsAuth) return <AuthRequired />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-ink">Padrón de psicólogos</h1>
        <p className="mt-1 text-sm text-slate-600">
          {roster.length} {roster.length === 1 ? 'persona registrada' : 'personas registradas'} en la plataforma.
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
            aria-label="Buscar en el padrón"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => {
              const active = tab.key === status;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatus(tab.key)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-navy bg-navy text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          {filtersActive && (
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
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
          </p>
        )}
        {!loaded ? (
          <ListSkeleton rows={5} />
        ) : results.length > 0 ? (
          pageItems.map((v) => {
            const style = STATUS_STYLE[v.estado];
            return (
              <article
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-surface-card p-4 shadow-card"
              >
                <div className="flex min-w-0 gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-navy">
                    {initialsOf(v.nombre)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">{v.nombre}</p>
                    <p className="truncate text-sm text-slate-500">
                      {[
                        v.cedula_profesional,
                        v.especialidad,
                        // All roles the account holds (#133), e.g. "Psicólogo/a · Coordinador/a".
                        (v.roles ?? [v.rol]).map((r) => ROLE_LABEL[r] ?? r).join(' · '),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
                  {style.label}
                </span>
              </article>
            );
          })
        ) : (
          !error && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-surface-card/60 px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <SearchX className="h-6 w-6 text-slate-400" aria-hidden />
              </span>
              <p className="mt-3 font-medium text-ink">Sin resultados</p>
              <p className="mt-1 text-sm text-slate-500">Ajusta la búsqueda o el filtro de estado.</p>
            </div>
          )
        )}
        {loaded && results.length > 0 && (
          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        )}
      </section>
    </div>
  );
}
