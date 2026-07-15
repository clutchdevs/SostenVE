'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AuthRequired } from '../../src/components/auth-required';
import { KpiSkeleton, ListSkeleton } from '../../src/components/skeleton';
import { CaseQueueTable } from '../../src/features/coordinator/case-queue-table';
import { CaseActionModal } from '../../src/features/coordinator/case-action-modal';
import { sortForBoard, summarizeOps } from '../../src/features/coordinator/operations';
import { apiFetch, ApiError } from '../../src/lib/api-client';
import type { CaseSummary, VolunteerView } from '../../src/lib/types';

const REFRESH_MS = 15_000;

interface CaseAction {
  caso: CaseSummary;
  mode: 'reassign' | 'close';
}

export default function CoordinatorBoard() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [psychologists, setPsychologists] = useState<VolunteerView[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [action, setAction] = useState<CaseAction | null>(null);
  // The clock is locale/time-based; rendering it during SSR (server runs UTC) and
  // again on the client caused a hydration mismatch. Only show it after mount.
  const [mounted, setMounted] = useState(false);
  const activeRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      // Refresh the reassignment picker's roster alongside the cases so its live
      // presence (en_linea) stays current — the picker only offers online
      // psychologists (issue #130). A roster failure must not blank the board.
      const [list, psys] = await Promise.all([
        apiFetch<CaseSummary[]>('/cases'),
        apiFetch<VolunteerView[]>('/volunteers?status=active').catch(() => null),
      ]);
      if (!activeRef.current) return;
      setCases(list);
      if (psys) setPsychologists(psys.filter((v) => v.rol === 'psychologist'));
      setUpdatedAt(new Date());
    } catch (err) {
      if (!activeRef.current) return;
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
      else setError('No se pudieron cargar los casos. Intenta de nuevo.');
    } finally {
      if (activeRef.current) setLoaded(true);
    }
  }, []);

  // Data polling (near real-time).
  useEffect(() => {
    activeRef.current = true;
    void refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      activeRef.current = false;
      clearInterval(timer);
    };
  }, [refresh]);

  // 1-second tick so the clock, "updated ago" and SLA chips stay live.
  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(t);
  }, []);

  const summary = useMemo(() => summarizeOps(cases, now), [cases, now]);
  const board = useMemo(() => sortForBoard(cases, now), [cases, now]);

  if (needsAuth) return <AuthRequired />;

  const clock = now.toLocaleString('es-VE', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  const agoSeconds = updatedAt
    ? Math.max(0, Math.round((now.getTime() - updatedAt.getTime()) / 1000))
    : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Cola de casos en vivo</h1>
          <p className="mt-1 text-sm capitalize text-slate-600">
            {mounted ? clock : ' '}
            {mounted && agoSeconds !== null && (
              <span className="lowercase"> · actualizado hace {agoSeconds} s</span>
            )}
          </p>
        </div>
        {summary.slaVencidos > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-sm font-semibold text-accent-coral">
            <span className="h-2 w-2 rounded-full bg-accent-coral" aria-hidden />
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {summary.slaVencidos} SLA {summary.slaVencidos === 1 ? 'vencido' : 'vencidos'}
          </span>
        )}
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loaded ? (
          <>
            <Kpi value={summary.riesgoAlto} label="Riesgo alto" className="text-accent-coral" />
            <Kpi value={summary.enCola} label="En cola" className="text-accent-amber" />
            <Kpi value={summary.psicologos} label="Psicólogos en atención" className="text-accent-teal" />
            <Kpi value={`${summary.esperaPromedioMin}m`} label="Espera promedio" className="text-navy" />
          </>
        ) : (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        )}
      </section>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-risk-high">
          {error}
        </p>
      )}

      {!loaded ? (
        <ListSkeleton rows={5} />
      ) : (
        <CaseQueueTable
          cases={board}
          now={now}
          onReassign={(caso) => setAction({ caso, mode: 'reassign' })}
          onClose={(caso) => setAction({ caso, mode: 'close' })}
        />
      )}

      {action && (
        <CaseActionModal
          caso={action.caso}
          mode={action.mode}
          psychologists={psychologists}
          onCancel={() => setAction(null)}
          onDone={() => {
            setAction(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

function Kpi({ value, label, className }: { value: number | string; label: string; className: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-surface-card p-5 shadow-card">
      <p className={`text-4xl font-bold tabular-nums ${className}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
