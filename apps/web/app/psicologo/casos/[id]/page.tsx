'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { NoteForm, type NoteSubmission } from '../../../../src/features/psychologist-portal/note-form';
import { apiFetch } from '../../../../src/lib/api-client';
import type { CaseSummary, ClinicalNoteView } from '../../../../src/lib/types';

interface CaseDetail {
  caso: CaseSummary;
  notas: ClinicalNoteView[];
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    apiFetch<CaseDetail>(`/cases/${id}`)
      .then(setDetail)
      .catch(() => setMessage('No se pudo cargar el caso.'));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function accept() {
    await apiFetch(`/cases/${id}/accept`, { method: 'POST' });
    setMessage('Caso aceptado.');
    load();
  }

  async function addNote(note: NoteSubmission) {
    try {
      await apiFetch(`/cases/${id}/notes`, { method: 'POST', body: note });
      setMessage('Nota registrada.');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo registrar la nota.');
    }
  }

  async function close() {
    await apiFetch(`/cases/${id}`, { method: 'PATCH', body: { estado: 'cerrado' } });
    setMessage('Caso cerrado.');
    load();
  }

  if (!detail) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p>{message || 'Cargando…'}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand">Caso</h1>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-sm">{detail.caso.estado}</span>
      </header>

      <p className="text-slate-600">
        {detail.caso.nivel_riesgo} · score {detail.caso.score_urgencia}
      </p>

      {message && <p className="rounded-md bg-emerald-50 p-3 text-emerald-800">{message}</p>}

      <div className="flex gap-2">
        <button onClick={accept} className="rounded-md bg-brand px-4 py-2 text-white" type="button">
          Aceptar caso
        </button>
        <button onClick={close} className="rounded-md border px-4 py-2" type="button">
          Cerrar caso
        </button>
      </div>

      <section>
        <h2 className="font-semibold">Notas</h2>
        <ul className="mt-2 space-y-2">
          {detail.notas.map((note) => (
            <li key={note.id} className="rounded-md border bg-white p-3 text-sm">
              {note.diagnostico && <p className="font-medium">{note.diagnostico}</p>}
              <p>{note.contenido}</p>
            </li>
          ))}
          {detail.notas.length === 0 && <li className="text-slate-500">Sin notas aún.</li>}
        </ul>
      </section>

      <NoteForm onSubmit={addNote} />
    </main>
  );
}
