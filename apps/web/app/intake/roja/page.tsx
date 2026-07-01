'use client';

import { useEffect, useState } from 'react';
import { CrisisLinesPanel } from '../../../src/components/crisis-lines-panel';
import { ConsentNotice } from '../../../src/components/consent-notice';
import { apiFetch } from '../../../src/lib/api-client';
import {
  FALLBACK_CRISIS_LINES,
  getCrisisLines,
  type CrisisLines,
} from '../../../src/lib/crisis-lines';

type SubChannel = 'recibir-llamada' | 'whatsapp-silencioso';

export default function RedBranchPage() {
  // Start from the embedded fallback so numbers render immediately, even before
  // (or without) any network — the crisis lines are never blank.
  const [lines, setLines] = useState<CrisisLines>(FALLBACK_CRISIS_LINES);
  const [sub, setSub] = useState<SubChannel | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    getCrisisLines().then(setLines).catch(() => undefined);
  }, []);

  async function submit() {
    if (!sub || !contact) return;
    try {
      await apiFetch('/intake/red-branch', {
        method: 'POST',
        auth: false,
        body: { sub_canal: sub, nombre: name || undefined, contacto: contact },
      });
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
