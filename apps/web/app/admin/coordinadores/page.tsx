'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuthRequired } from '../../../src/components/auth-required';
import { ListSkeleton } from '../../../src/components/skeleton';
import { CoordinatorInvitations } from '../../../src/features/admin/coordinator-invitations';
import { apiFetch, ApiError } from '../../../src/lib/api-client';
import type { CoordinatorInvitationView } from '../../../src/lib/types';

export default function CoordinatorsPage() {
  const [invitations, setInvitations] = useState<CoordinatorInvitationView[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      setInvitations(await apiFetch<CoordinatorInvitationView[]>('/admin/coordinators/invitations'));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
      else setError('No se pudieron cargar las invitaciones.');
    } finally {
      setLoaded(true);
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
      {!loaded ? (
        <ListSkeleton rows={3} />
      ) : (
        <CoordinatorInvitations invitations={invitations} onChange={load} />
      )}
    </div>
  );
}
