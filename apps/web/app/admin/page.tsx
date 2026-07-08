'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AuthRequired } from '../../src/components/auth-required';
import { RegistrationExceptions } from '../../src/features/admin/registration-exceptions';
import { autoValidationRate } from '../../src/features/admin/volunteers';
import { apiFetch, ApiError } from '../../src/lib/api-client';
import type { VolunteerView } from '../../src/lib/types';

export default function RegistrationExceptionsPage() {
  const [roster, setRoster] = useState<VolunteerView[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // The full roster lets us both list exceptions and measure the auto rate.
      setRoster(await apiFetch<VolunteerView[]>('/volunteers?status=all'));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
      else setError('No se pudieron cargar los registros. Intenta de nuevo.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const exceptions = useMemo(
    () => roster.filter((v) => v.rol === 'psychologist' && v.estado === 'pending_approval'),
    [roster],
  );
  const rate = useMemo(() => autoValidationRate(roster), [roster]);

  const resolve = useCallback(
    async (id: string, action: 'approve' | 'reject') => {
      setBusyId(id);
      setError('');
      try {
        await apiFetch(`/volunteers/${id}/${action}`, { method: 'POST' });
        await load();
      } catch {
        setError('No se pudo completar la acción. Intenta de nuevo.');
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  if (needsAuth) return <AuthRequired />;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-ink">Excepciones de registro</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Registros que no pudieron validarse automáticamente con la FPV y requieren revisión manual.
        </p>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-risk-high">
          {error}
        </p>
      )}

      <RegistrationExceptions
        exceptions={exceptions}
        busyId={busyId}
        onApprove={(id) => resolve(id, 'approve')}
        onReject={(id) => resolve(id, 'reject')}
      />

      {rate !== null && (
        <div className="flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
            <ShieldCheck className="h-5 w-5 text-accent-green" aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-ink">Sistema FPV operativo</p>
            <p className="mt-0.5 text-sm text-slate-600">
              El {rate}% de los registros se validaron automáticamente sin intervención.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
