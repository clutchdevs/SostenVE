'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FilterX, Search, SearchX } from 'lucide-react';
import { AuthRequired } from '../../../src/components/auth-required';
import { PsychologistCaseCard } from '../../../src/features/psychologist-portal/psychologist-case-card';
import {
  EMPTY_FILTERS,
  filterCases,
  sortByUrgency,
  type BranchFilter,
  type CaseFilters,
  type EstadoFilter,
  type RiskFilter,
} from '../../../src/features/psychologist-portal/caseload';
import { apiFetch, ApiError } from '../../../src/lib/api-client';
import type { CaseSummary } from '../../../src/lib/types';

const RISK_TABS: { key: RiskFilter; label: string; dot?: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'riesgo_alto', label: 'Alta', dot: 'bg-risk-high' },
  { key: 'riesgo_moderado', label: 'Moderada', dot: 'bg-risk-moderate' },
  { key: 'seguimiento', label: 'Seguimiento', dot: 'bg-risk-followup' },
];

const BRANCH_TABS: { key: BranchFilter; label: string; dot?: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'roja', label: 'Roja', dot: 'bg-risk-high' },
  { key: 'verde', label: 'Verde', dot: 'bg-emerald-500' },
];

const ESTADO_TABS: { key: EstadoFilter; label: string; dot?: string }[] = [
  { key: 'activos', label: 'Activos', dot: 'bg-emerald-500' },
  { key: 'cerrados', label: 'Cerrados', dot: 'bg-slate-400' },
  { key: 'todas', label: 'Todos' },
];

export default function CasesListPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [filters, setFilters] = useState<CaseFilters>(EMPTY_FILTERS);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<CaseSummary[]>('/cases')
      .then(setCases)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
        else setError('No se pudieron cargar los casos. Intenta de nuevo.');
      });
  }, []);

  const results = useMemo(
    () => sortByUrgency(filterCases(cases, filters)),
    [cases, filters],
  );

  // "Dirty" whenever any filter departs from the default view (active + no search).
  const isFiltered =
    filters.search !== '' ||
    filters.risk !== 'todas' ||
    filters.branch !== 'todas' ||
    filters.estado !== EMPTY_FILTERS.estado;

  if (needsAuth) return <AuthRequired />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-ink">Mis casos</h1>
        <p className="mt-1 text-sm text-slate-600">
          {cases.length} {cases.length === 1 ? 'caso asignado' : 'casos asignados'} en total.
        </p>
      </header>

      {/* Toolbar: search + filters */}
      <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-surface-card p-4 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Buscar por nombre o teléfono…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
            aria-label="Buscar por nombre o teléfono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Estado"
            options={ESTADO_TABS}
            value={filters.estado}
            onChange={(estado) => setFilters((f) => ({ ...f, estado }))}
          />
          <FilterSelect
            label="Riesgo"
            options={RISK_TABS}
            value={filters.risk}
            onChange={(risk) => setFilters((f) => ({ ...f, risk }))}
          />
          <FilterSelect
            label="Rama"
            options={BRANCH_TABS}
            value={filters.branch}
            onChange={(branch) => setFilters((f) => ({ ...f, branch }))}
          />
          {isFiltered && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <FilterX className="h-3.5 w-3.5" aria-hidden />
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
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
        </p>
        {results.length > 0 ? (
          results.map((caso) => (
            <PsychologistCaseCard
              key={caso.caso_id}
              caso={caso}
              onOpen={(id) => router.push(`/psicologo/casos/${id}`)}
            />
          ))
        ) : (
          !error && <NoResults hasCases={cases.length > 0} />
        )}
      </section>
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; label: string; dot?: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={label}
        className="rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-navy/10"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NoResults({ hasCases }: { hasCases: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-surface-card/60 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <SearchX className="h-6 w-6 text-slate-400" aria-hidden />
      </span>
      <p className="mt-3 font-medium text-ink">
        {hasCases ? 'Ningún caso coincide con los filtros' : 'No tienes casos asignados'}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {hasCases ? 'Ajusta la búsqueda o limpia los filtros.' : 'Cuando se te asigne un caso, aparecerá aquí.'}
      </p>
    </div>
  );
}
