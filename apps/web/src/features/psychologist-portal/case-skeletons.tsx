import { Skeleton } from '../../components/skeleton';

/** Card-shaped placeholder that mimics a case row while the list loads. */
function CaseCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-surface-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

/** A short stack of case-card placeholders shown while the case list loads. */
export function CaseListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando casos">
      {Array.from({ length: rows }).map((_, i) => (
        <CaseCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** KPI-card placeholder for the dashboard while the counts load. */
export function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-surface-card p-5 shadow-card">
      <Skeleton className="h-9 w-12" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

/** Placeholder for the case detail view (identity card + primary action). */
export function CaseDetailSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando caso">
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-surface-card p-5 shadow-card">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
