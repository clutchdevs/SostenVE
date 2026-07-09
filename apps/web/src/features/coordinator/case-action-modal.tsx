'use client';

import { useState } from 'react';
import { Spinner } from '../../components/spinner';
import { apiFetch } from '../../lib/api-client';
import { caseCode, requesterLabel } from './operations';
import type { CaseSummary, VolunteerView } from '../../lib/types';

interface Props {
  caso: CaseSummary;
  mode: 'reassign' | 'close';
  psychologists: VolunteerView[];
  onCancel: () => void;
  onDone: () => void;
}

const CLOSE_REASONS: { value: string; label: string }[] = [
  { value: 'estancado', label: 'Estancado (sin avance)' },
  { value: 'duplicado', label: 'Caso duplicado' },
  { value: 'resuelto_externamente', label: 'Resuelto por otra vía' },
  { value: 'solicitud_tercero', label: 'Solicitud hecha por un tercero' },
  { value: 'otro', label: 'Otro' },
];

/** Modal for the coordinator's manual case actions: reassign or administrative close. */
export function CaseActionModal({ caso, mode, psychologists, onCancel, onDone }: Props) {
  const [volunteerId, setVolunteerId] = useState('');
  const [reason, setReason] = useState('estancado');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      if (mode === 'reassign') {
        if (!volunteerId) {
          setError('Selecciona un psicólogo.');
          setBusy(false);
          return;
        }
        await apiFetch(`/cases/${caso.caso_id}/reassign`, {
          method: 'POST',
          body: { voluntario_id: volunteerId },
        });
      } else {
        await apiFetch(`/cases/${caso.caso_id}/coordinator-close`, {
          method: 'POST',
          body: { motivo: reason },
        });
      }
      onDone();
    } catch {
      setError('No se pudo completar la acción. Intenta de nuevo.');
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-xl font-semibold text-ink">
          {mode === 'reassign' ? 'Reasignar caso' : 'Cerrar caso'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {requesterLabel(caso)} · <span className="font-mono">{caseCode(caso)}</span>
        </p>

        {mode === 'reassign' ? (
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Psicólogo
            <select
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
              value={volunteerId}
              onChange={(e) => setVolunteerId(e.target.value)}
            >
              <option value="">Selecciona un psicólogo activo…</option>
              {psychologists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.especialidad ? ` · ${p.especialidad}` : ''}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Motivo del cierre
            <select
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {CLOSE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && <p className="mt-3 text-sm text-risk-high">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={confirm}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              mode === 'close' ? 'bg-accent-coral hover:opacity-90' : 'bg-navy hover:bg-navy-hover'
            }`}
          >
            {busy && <Spinner />}
            {busy
              ? mode === 'reassign'
                ? 'Reasignando…'
                : 'Cerrando…'
              : mode === 'reassign'
                ? 'Reasignar'
                : 'Cerrar caso'}
          </button>
        </div>
      </div>
    </div>
  );
}
