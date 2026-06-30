'use client';

import { useState } from 'react';
import { Check, Lock, Ban } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { initialsOf, STATUS_STYLE } from '../admin/volunteers';
import type { VolunteerNoteView, VolunteerView } from '../../lib/types';

interface Props {
  volunteer: VolunteerView;
  onChange: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  psychologist: 'Psicólogo/a',
  coordinator: 'Coordinador/a',
  admin: 'Administrador/a',
};

/** Volunteer row with management actions (approve/suspend) and confidential notes (RF-2.3/2.4). */
export function VolunteerCard({ volunteer, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<VolunteerNoteView[] | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const style = STATUS_STYLE[volunteer.estado];

  async function act(action: 'approve' | 'reject') {
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/volunteers/${volunteer.id}/${action}`, { method: 'POST' });
      onChange();
    } catch {
      setError('No se pudo completar la acción.');
    } finally {
      setBusy(false);
    }
  }

  async function loadNotes() {
    try {
      setNotes(await apiFetch<VolunteerNoteView[]>(`/volunteers/${volunteer.id}/notes`));
    } catch {
      setError('No se pudieron cargar las notas.');
    }
  }

  function toggleNotes() {
    const next = !notesOpen;
    setNotesOpen(next);
    if (next && notes === null) void loadNotes();
  }

  async function addNote() {
    if (!draft.trim()) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/volunteers/${volunteer.id}/notes`, {
        method: 'POST',
        body: { contenido: draft.trim() },
      });
      setDraft('');
      await loadNotes();
    } catch {
      setError('No se pudo guardar la nota.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-surface-card p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-navy">
            {initialsOf(volunteer.nombre)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy">{volunteer.nombre}</p>
            <p className="truncate text-xs text-slate-500">
              {[volunteer.cedula_profesional, volunteer.especialidad, ROLE_LABEL[volunteer.rol] ?? volunteer.rol]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
            {style.label}
          </span>
          {volunteer.estado !== 'active' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => act('approve')}
              className="inline-flex items-center gap-1 rounded-xl bg-accent-green px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Check className="h-4 w-4" aria-hidden />
              Activar
            </button>
          )}
          {volunteer.estado === 'active' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => act('reject')}
              className="inline-flex items-center gap-1 rounded-xl border border-accent-coral px-3 py-1.5 text-sm font-semibold text-accent-coral hover:bg-red-50 disabled:opacity-50"
            >
              <Ban className="h-4 w-4" aria-hidden />
              Suspender
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={toggleNotes}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-navy"
      >
        <Lock className="h-3.5 w-3.5" aria-hidden />
        Notas confidenciales{notesOpen ? '' : ' ▸'}
      </button>

      {notesOpen && (
        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          {notes === null ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : notes.length > 0 ? (
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-700">
                  <p>{n.contenido}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(n.creada_en).toLocaleString('es-VE')}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Sin notas.</p>
          )}
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
              placeholder="Nota (solo coordinación/admin)"
              value={draft}
              maxLength={1500}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={addNote}
              className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy-hover disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-risk-high">{error}</p>}
    </article>
  );
}
