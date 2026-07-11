interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/**
 * Shared client-side pagination control (‹ Anterior · Página X de Y · Siguiente ›).
 * Always visible when rendered (even for a single page — the prev/next buttons
 * simply stay disabled), so users can always see how the list is paginated; the
 * caller decides whether to render it (typically only when there are results).
 * Kept as one component so every paginated list looks and behaves identically.
 */
export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-md border border-slate-300 px-3 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        ‹ Anterior
      </button>
      <span className="text-slate-500">
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-md border border-slate-300 px-3 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        Siguiente ›
      </button>
    </div>
  );
}
