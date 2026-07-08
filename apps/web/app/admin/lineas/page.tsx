'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuthRequired } from '../../../src/components/auth-required';
import { CrisisLinesAdmin } from '../../../src/features/admin/crisis-lines-admin';
import { apiFetch, ApiError } from '../../../src/lib/api-client';
import type { CrisisLineAdmin } from '../../../src/lib/types';

export default function CrisisLinesPage() {
  const [lines, setLines] = useState<CrisisLineAdmin[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLines(await apiFetch<CrisisLineAdmin[]>('/admin/crisis-lines'));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
      else setError('No se pudieron cargar las líneas de crisis.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (needsAuth) return <AuthRequired />;

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-risk-high">
          {error}
        </p>
      )}
      <CrisisLinesAdmin lines={lines} onChange={load} />
    </div>
  );
}
