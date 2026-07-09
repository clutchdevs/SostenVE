/**
 * Neutral loading placeholder. Renders a soft pulsing block so a section shows
 * "loading" immediately instead of a blank flash while its data is fetched
 * (client-side fetches don't trigger a Suspense/`loading.tsx` boundary).
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} aria-hidden />;
}
