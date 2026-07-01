'use client';

import { useEffect, useState } from 'react';
import { CrisisLinesPanel } from '../../../src/components/crisis-lines-panel';
import { ConsentNotice } from '../../../src/components/consent-notice';
import { apiFetch, ApiError } from '../../../src/lib/api-client';
import {
  FALLBACK_CRISIS_LINES,
  getCrisisLines,
  type CrisisLines,
} from '../../../src/lib/crisis-lines';
import { clearDraft, INTAKE_DRAFT_KEYS, loadDraft, saveDraft } from '../../../src/lib/intake-draft';
import { enqueueSubmission } from '../../../src/lib/intake-outbox';

type SubChannel = 'recibir-llamada' | 'whatsapp-silencioso';

interface RedDraft {
  sub: SubChannel | null;
  name: string;
  contact: string;
}

export default function RedBranchPage() {
  // Start from the embedded fallback so numbers render immediately, even before
  // (or without) any network — the crisis lines are never blank.
  const [lines, setLines] = useState<CrisisLines>(FALLBACK_CRISIS_LINES);
  const [sub, setSub] = useState<SubChannel | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [done, setDone] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    getCrisisLines().then(setLines).catch(() => undefined);
  }, []);

  // Restore any draft from a previous (possibly offline) visit, then persist.
  useEffect(() => {
    const draft = loadDraft<RedDraft>(INTAKE_DRAFT_KEYS.roja);
    if (draft) {
      setSub(draft.sub);
      setName(draft.name);
      setContact(draft.contact);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !done) saveDraft<RedDraft>(INTAKE_DRAFT_KEYS.roja, { sub, name, contact });
  }, [hydrated, done, sub, name, contact]);

  async function submit() {
    if (!sub || !contact) return;
    const payload = { sub_canal: sub, nombre: name || undefined, contacto: contact };
    try {
      await apiFetch('/intake/red-branch', { method: 'POST', auth: false, body: payload });
      clearDraft(INTAKE_DRAFT_KEYS.roja);
    } catch (err) {
      // A high-risk contact request must never be silently dropped: on a network
      // or server error, queue it for automatic retry. A 4xx won't improve on
      // retry, so we don't queue it. Either way the crisis lines stay visible.
      if (!(err instanceof ApiError) || err.status >= 500) {
        enqueueSubmission('/intake/red-branch', payload);
        clearDraft(INTAKE_DRAFT_KEYS.roja);
      }
    } finally {
      setDone(true); // even if it fails, the crisis lines above remain visible
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 space-y-6">
      <CrisisLinesPanel lines={lines} />

      {lines.active && (
        <a
          href={`tel:${lines.active.phone.replace(/\s+/g, '')}`}
          className="block rounded-lg bg-risk-high px-4 py-3 text-center font-semibold text-white"
        >
          Llamar ahora a {lines.active.name}
        </a>
      )}

      {!done ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">¿Prefieres que te contactemos?</h2>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              aria-pressed={sub === 'recibir-llamada'}
              onClick={() => setSub('recibir-llamada')}
              className={`flex-1 rounded-md border px-3 py-2 text-sm ${sub === 'recibir-llamada' ? 'bg-brand text-white' : 'bg-white'}`}
            >
              Recibir una llamada
            </button>
            <button
              type="button"
              aria-pressed={sub === 'whatsapp-silencioso'}
              onClick={() => setSub('whatsapp-silencioso')}
              className={`flex-1 rounded-md border px-3 py-2 text-sm ${sub === 'whatsapp-silencioso' ? 'bg-brand text-white' : 'bg-white'}`}
            >
              WhatsApp silencioso
            </button>
          </div>

          {sub && (
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-md border px-3 py-2"
                placeholder="Nombre (opcional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="w-full rounded-md border px-3 py-2"
                placeholder="Teléfono de contacto"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
              <button
                type="button"
                onClick={submit}
                disabled={!contact}
                className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          )}
        </section>
      ) : (
        <p className="rounded-lg bg-emerald-50 p-4 text-emerald-800">
          Registramos tu solicitud. Mientras tanto, las líneas de arriba siguen disponibles.
        </p>
      )}

      <ConsentNotice />
    </main>
  );
}
