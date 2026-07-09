'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuthRequired } from '../../../src/components/auth-required';
import { ListSkeleton } from '../../../src/components/skeleton';
import { AuditViewer } from '../../../src/features/admin/audit-viewer';
import { apiFetch, ApiError } from '../../../src/lib/api-client';
import type { AuditEntryView, AuditPageView } from '../../../src/lib/types';

const PAGE_SIZE = 50;

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntryView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (filter.trim()) params.set('accion', filter.trim());
    try {
      const data = await apiFetch<AuditPageView>(`/admin/audit?${params.toString()}`);
      setEntries(data.items);
      setTotal(data.total);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
      else setError('No se pudo cargar la auditoría.');
    } finally {
      setLoaded(true);
    }
  }, [page, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset to the first page whenever the filter changes.
  const onFilter = useCallback((value: string) => {
    setFilter(value);
    setPage(0);
  }, []);

  if (needsAuth) return <AuthRequired />;

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-risk-high">
          {error}
        </p>
      )}
      {!loaded ? (
        <ListSkeleton rows={6} />
      ) : (
        <AuditViewer
          entries={entries}
          filter={filter}
          onFilter={onFilter}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </div>
  );
}
