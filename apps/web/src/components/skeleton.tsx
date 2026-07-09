/**
 * Neutral loading placeholder. Renders a soft pulsing block so a section shows
 * "loading" immediately instead of a blank flash while its data is fetched
 * (client-side fetches don't trigger a Suspense/`loading.tsx` boundary).
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} aria-hidden />;
}

/** KPI-card placeholder for dashboard stat grids. */
export function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-surface-card p-5 shadow-card">
      <Skeleton className="h-9 w-12" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

/** Card-shaped placeholder row (avatar + two text lines + a trailing chip). */
export function RowSkeleton() {
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

/** A short stack of row placeholders for lists/tables while they load. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando">
      {Array.from({ length: rows }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  );
}
