'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuthRequired } from '../../../src/components/auth-required';
import { Skeleton } from '../../../src/components/skeleton';
import { apiFetch, ApiError } from '../../../src/lib/api-client';

interface AssignmentSettings {
  max_active_caseload: number;
}

/**
 * Admin control for the load-balancing caseload cap (RF-2.5). Reads and updates
 * the single runtime setting via /admin/assignment-settings.
 */
export default function AssignmentSettingsPage() {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState<number | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await apiFetch<AssignmentSettings>('/admin/assignment-settings');
      setValue(String(s.max_active_caseload));
      setSaved(s.max_active_caseload);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
      else setError('No se pudo cargar la configuración.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setError('');
    setOk('');
    const n = Number.parseInt(value, 10);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      setError('Ingresa un número entre 1 y 100.');
      return;
    }
    setBusy(true);
    try {
      const s = await apiFetch<AssignmentSettings>('/admin/assignment-settings', {
        method: 'PUT',
        body: { max_active_caseload: n },
      });
      setSaved(s.max_active_caseload);
      setValue(String(s.max_active_caseload));
      setOk('Configuración guardada.');
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (needsAuth) return <AuthRequired />;

  const dirty = saved !== null && String(saved) !== value.trim();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-ink">Asignación de casos</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Balanceo de carga: cuántos casos <strong>activos</strong> (asignados, aceptados o en
          seguimiento) puede tener un psicólogo antes de que el sistema deje de asignarle casos
          nuevos y reparta al menos cargado. Los casos de <strong>alto riesgo</strong> pueden exceder
          el tope para no quedar sin atención.
        </p>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-risk-high">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-accent-green">
          {ok}
        </p>
      )}

      {saved === null && !error ? (
        <div className="max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <Skeleton className="h-4 w-2/3" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>
      ) : (
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6">
        <label htmlFor="cap" className="block text-sm font-medium text-slate-700">
          Máximo de casos activos por psicólogo
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            id="cap"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 3))}
            className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-ink"
          />
          <button
            type="button"
            onClick={save}
            disabled={busy || !dirty}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Por defecto: 6. Rango permitido: 1–100.</p>
      </div>
      )}
    </div>
  );
}
