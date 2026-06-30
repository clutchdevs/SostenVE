'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuthRequired } from '../../src/components/auth-required';
import { AuditViewer } from '../../src/features/admin/audit-viewer';
import { CoordinatorInvitations } from '../../src/features/admin/coordinator-invitations';
import { CrisisLinesAdmin } from '../../src/features/admin/crisis-lines-admin';
import { apiFetch, ApiError } from '../../src/lib/api-client';
import type {
  AuditEntryView,
  CoordinatorInvitationView,
  CrisisLineAdmin,
} from '../../src/lib/types';

export default function AdminPanel() {
  const [lines, setLines] = useState<CrisisLineAdmin[]>([]);
  const [invitations, setInvitations] = useState<CoordinatorInvitationView[]>([]);
  const [audit, setAudit] = useState<AuditEntryView[]>([]);
  const [filter, setFilter] = useState('');
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');

  const loadLines = useCallback(async () => {
    try {
      setLines(await apiFetch<CrisisLineAdmin[]>('/admin/crisis-lines'));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
      else setError('No se pudieron cargar las líneas de crisis.');
    }
  }, []);

  const loadInvitations = useCallback(async () => {
    try {
      setInvitations(
        await apiFetch<CoordinatorInvitationView[]>('/admin/coordinators/invitations'),
      );
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    const query = filter.trim() ? `?accion=${encodeURIComponent(filter.trim())}` : '';
    try {
      setAudit(await apiFetch<AuditEntryView[]>(`/admin/audit${query}`));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
    }
  }, [filter]);

  useEffect(() => {
    void loadLines();
  }, [loadLines]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  // Refresh the audit log after a crisis-line change so the action shows up.
  const onLinesChange = useCallback(() => {
    void loadLines();
    void loadAudit();
  }, [loadLines, loadAudit]);

  // Refresh invitations + audit after an invitation change.
  const onInvitationsChange = useCallback(() => {
    void loadInvitations();
    void loadAudit();
  }, [loadInvitations, loadAudit]);

  if (needsAuth) {
    return <AuthRequired />;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <h1 className="text-xl font-bold text-brand">Administración</h1>
      {error && <p className="text-risk-high">{error}</p>}
      <CrisisLinesAdmin lines={lines} onChange={onLinesChange} />
      <CoordinatorInvitations invitations={invitations} onChange={onInvitationsChange} />
      <AuditViewer entries={audit} filter={filter} onFilter={setFilter} />
    </main>
  );
}
