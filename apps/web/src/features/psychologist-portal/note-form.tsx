'use client';

import { useState } from 'react';
import { Spinner } from '../../components/spinner';
import { EVENT_DATE, TEPT_BLOCK_DAYS, weeksSince } from '../../lib/config';

export interface NoteSubmission {
  contenido: string;
  diagnostico?: string;
  tept_diagnostico: boolean;
  crisis_psicotica_aguda: boolean;
}

/**
 * Clinical note form. Mirrors the backend safety rules at the UX level: a PTSD
 * (TEPT) diagnosis is blocked before the configured window (RF-4.3); the backend
 * still re-validates. Marking an acute psychotic crisis (RF-4.2.9) is allowed and
 * handled server-side.
 */
export function NoteForm({
  onSubmit,
  eventDate = EVENT_DATE,
  now = new Date(),
}: {
  onSubmit: (note: NoteSubmission) => void | Promise<void>;
  eventDate?: string;
  now?: Date;
}) {
  const [contenido, setContenido] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [tept, setTept] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const teptTooEarly = tept && weeksSince(eventDate, now) < TEPT_BLOCK_DAYS / 7;
  const canSubmit = contenido.trim().length > 0 && !teptTooEarly;

  return (
    <form
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!canSubmit || submitting) return;
        setSubmitting(true);
        try {
          await onSubmit({
            contenido,
            diagnostico: diagnostico || undefined,
            tept_diagnostico: tept,
            crisis_psicotica_aguda: crisis,
          });
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <h3 className="font-semibold">Nueva nota clínica</h3>
      <textarea
        className="w-full rounded-md border px-3 py-2"
        placeholder="Evolución / contenido"
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
      />
      <input
        className="w-full rounded-md border px-3 py-2"
        placeholder="Diagnóstico (opcional)"
        value={diagnostico}
        onChange={(e) => setDiagnostico(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={tept} onChange={(e) => setTept(e.target.checked)} />
        Diagnóstico de TEPT
      </label>
      {teptTooEarly && (
        <p role="alert" className="text-sm font-medium text-risk-high">
          No se puede registrar un diagnóstico de TEPT antes de 4 semanas del evento.
        </p>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={crisis} onChange={(e) => setCrisis(e.target.checked)} />
        Crisis psicótica aguda (deriva a urgente)
      </label>
      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {submitting && <Spinner />}
        {submitting ? 'Guardando…' : 'Guardar nota'}
      </button>
    </form>
  );
}
