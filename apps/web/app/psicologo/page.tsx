'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Inbox } from 'lucide-react';
import { AuthRequired } from '../../src/components/auth-required';
import { PsychologistCaseCard } from '../../src/features/psychologist-portal/psychologist-case-card';
import {
  greeting,
  sortByUrgency,
  summarizeCaseload,
} from '../../src/features/psychologist-portal/caseload';
import { apiFetch, ApiError } from '../../src/lib/api-client';
import type { CaseSummary } from '../../src/lib/types';

export default function PsychologistHome() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch<CaseSummary[]>('/cases')
      .then(setCases)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setNeedsAuth(true);
        } else {
          setError('No se pudieron cargar los casos. Intenta de nuevo.');
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const summary = useMemo(() => summarizeCaseload(cases), [cases]);
  const ordered = useMemo(() => sortByUrgency(cases), [cases]);
  const PREVIEW_LIMIT = 5;
  const preview = ordered.slice(0, PREVIEW_LIMIT);

  if (needsAuth) {
    return <AuthRequired />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">{greeting()}</h1>
          <p className="mt-1 text-sm text-slate-600">{subtitle(summary)}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          Recibiendo casos
        </span>
      </header>

      {/* KPI cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard value={summary.nuevos} label="Nuevo · acepta en <5 min" tone="orange" />
        <KpiCard value={summary.enCurso} label="En curso" tone="blue" />
        <KpiCard value={summary.atendidosMes} label="Atendidos este mes" tone="dark" />
      </section>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-risk-high">
          {error}
        </p>
      )}

      {/* Assigned cases */}
      <section id="casos" className="space-y-4 scroll-mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Casos asignados a ti
          </h2>
          {cases.length > 0 && (
            <Link
              href="/psicologo/casos"
              className="inline-flex items-center gap-1 text-sm font-medium text-navy hover:text-navy-hover"
            >
              Ver todos ({cases.length})
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
        {preview.length > 0 ? (
          <div className="space-y-3">
            {preview.map((caso) => (
              <PsychologistCaseCard
                key={caso.caso_id}
                caso={caso}
                onOpen={(id) => router.push(`/psicologo/casos/${id}`)}
              />
            ))}
          </div>
        ) : (
          loaded && !error && <EmptyState />
        )}
      </section>
    </div>
  );
}

function subtitle({ nuevos, enCurso }: { nuevos: number; enCurso: number }): string {
  const a = `${nuevos} ${nuevos === 1 ? 'caso nuevo' : 'casos nuevos'} esperando aceptación`;
  const b = `${enCurso} en curso`;
  return `Tienes ${a} y ${b}.`;
}

const TONE: Record<'orange' | 'blue' | 'dark', string> = {
  orange: 'text-accent-orange',
  blue: 'text-accent-blue',
  dark: 'text-ink',
};

function KpiCard({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'orange' | 'blue' | 'dark';
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-surface-card p-5 shadow-card">
      <p className={`text-4xl font-bold tabular-nums ${TONE[tone]}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-surface-card/60 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Inbox className="h-6 w-6 text-slate-400" aria-hidden />
      </span>
      <p className="mt-3 font-medium text-ink">No tienes casos asignados</p>
      <p className="mt-1 text-sm text-slate-500">
        Cuando se te asigne un caso, aparecerá aquí para que lo aceptes.
      </p>
    </div>
  );
}
