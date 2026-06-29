'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { NoteForm, type NoteSubmission } from '../../../../src/features/psychologist-portal/note-form';
import {
  ClinicalClosureForm,
  type ClosureSubmission,
} from '../../../../src/features/psychologist-portal/clinical-closure-form';
import { CaseIdentityCard } from '../../../../src/features/psychologist-portal/case-identity-card';
import { ClosureSummary } from '../../../../src/features/psychologist-portal/closure-summary';
import { apiFetch } from '../../../../src/lib/api-client';
import type {
  CaseClosureView,
  CaseContactView,
  CaseSummary,
  ClinicalNoteView,
} from '../../../../src/lib/types';

interface CaseDetail {
  caso: CaseSummary;
  contacto: CaseContactView | null;
  notas: ClinicalNoteView[];
  cierre: CaseClosureView | null;
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
    try {
      await apiFetch(`/cases/${id}/accept`, { method: 'POST' });
      setMessage('Caso aceptado.');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo aceptar el caso.');
    }
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

  async function close(closure: ClosureSubmission) {
    try {
      await apiFetch(`/cases/${id}/close`, { method: 'POST', body: closure });
      setMessage('Caso cerrado.');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo cerrar el caso.');
    }
  }

  if (!detail) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p>{message || 'Cargando…'}</p>
      </main>
    );
  }

  const status = detail.caso.estado;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <CaseIdentityCard caso={detail.caso} contacto={detail.contacto} />

      {message && <p className="rounded-md bg-emerald-50 p-3 text-emerald-800">{message}</p>}

      {status === 'asignado' && (
        <button onClick={accept} className="w-full rounded-md bg-brand px-4 py-3 font-semibold text-white" type="button">
          Aceptar caso
        </button>
      )}

      {status === 'pendiente' && (
        <p className="rounded-md bg-amber-50 p-3 text-amber-800">
          Este caso aún no te ha sido asignado para aceptar.
        </p>
      )}

      {status === 'aceptado' && (
        <>
          <section>
            <h2 className="font-semibold">Notas</h2>
            <NotesList notes={detail.notas} />
          </section>
          <NoteForm onSubmit={addNote} />
          <ClinicalClosureForm onSubmit={close} />
        </>
      )}

      {status === 'cerrado' && (
        <>
          <p className="rounded-md bg-slate-100 p-3 text-slate-700">
            Caso cerrado. Esta vista es de solo lectura.
          </p>
          {detail.cierre && <ClosureSummary cierre={detail.cierre} />}
          <section>
            <h2 className="font-semibold">Notas</h2>
            <NotesList notes={detail.notas} />
          </section>
        </>
      )}
    </main>
  );
}

function NotesList({ notes }: { notes: ClinicalNoteView[] }) {
  if (notes.length === 0) return <p className="mt-2 text-slate-500">Sin notas aún.</p>;
  return (
    <ul className="mt-2 space-y-2">
      {notes.map((note) => (
        <li key={note.id} className="rounded-md border bg-white p-3 text-sm">
          {note.diagnostico && <p className="font-medium">{note.diagnostico}</p>}
          <p>{note.contenido}</p>
        </li>
      ))}
    </ul>
  );
}
