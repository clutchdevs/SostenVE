'use client';

import { useEffect, useState } from 'react';
import { CrisisLinesPanel } from '../../../src/components/crisis-lines-panel';
import { ConsentNotice } from '../../../src/components/consent-notice';
import { SubmitButton } from '../../../src/components/submit-button';
import { apiFetch, ApiError } from '../../../src/lib/api-client';
import {
  FALLBACK_CRISIS_LINES,
  getCrisisLines,
  type CrisisLines,
} from '../../../src/lib/crisis-lines';
import { clearDraft, INTAKE_DRAFT_KEYS, loadDraft, saveDraft } from '../../../src/lib/intake-draft';
import { enqueueSubmission } from '../../../src/lib/intake-outbox';
import { ui } from '../../../src/lib/ui';
import { isValidVePhone, PHONE_ERROR, PHONE_MAX_LENGTH } from '../../../src/lib/validation';

type SubChannel = 'recibir-llamada' | 'whatsapp-silencioso';

interface RedDraft {
  sub: SubChannel | null;
  name: string;
  contact: string;
  age: string;
}

export default function RedBranchPage() {
  // Start from the embedded fallback so numbers render immediately, even before
  // (or without) any network — the crisis lines are never blank.
  const [lines, setLines] = useState<CrisisLines>(FALLBACK_CRISIS_LINES);
  const [sub, setSub] = useState<SubChannel | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [age, setAge] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
      setAge(draft.age ?? '');
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !done) saveDraft<RedDraft>(INTAKE_DRAFT_KEYS.roja, { sub, name, contact, age });
  }, [hydrated, done, sub, name, contact, age]);

  async function submit() {
    if (!sub || !contact) return;
    if (!isValidVePhone(contact)) {
      setError(PHONE_ERROR);
      return;
    }
    setError('');
    setBusy(true);
    // Age is a critical clinical parameter (minor vs geriatric priority) per
    // RF-1.2.2 / RF-1.2.3; sent when provided.
    const parsedAge = age.trim() === '' ? undefined : Number(age);
    const payload = {
      sub_canal: sub,
      nombre: name || undefined,
      contacto: contact,
      edad: parsedAge !== undefined && Number.isFinite(parsedAge) ? parsedAge : undefined,
    };
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
        <section className={`p-4 ${ui.card}`}>
          <h2 className="font-serif text-lg font-semibold text-ink">¿Prefieres que te contactemos?</h2>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              aria-pressed={sub === 'recibir-llamada'}
              onClick={() => setSub('recibir-llamada')}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium ${sub === 'recibir-llamada' ? 'border-ppv-blue bg-ppv-blue text-white' : 'border-slate-300 bg-white text-ink'}`}
            >
              Recibir una llamada
            </button>
            <button
              type="button"
              aria-pressed={sub === 'whatsapp-silencioso'}
              onClick={() => setSub('whatsapp-silencioso')}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium ${sub === 'whatsapp-silencioso' ? 'border-ppv-blue bg-ppv-blue text-white' : 'border-slate-300 bg-white text-ink'}`}
            >
              WhatsApp silencioso
            </button>
          </div>

          {sub && (
            <div className="mt-4 space-y-3">
              <input
                className={ui.field}
                placeholder="Nombre (opcional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className={ui.field}
                type="tel"
                inputMode="tel"
                maxLength={PHONE_MAX_LENGTH}
                placeholder="Teléfono de contacto (ej. 0414-1234567)"
                value={contact}
                onChange={(e) => setContact(e.target.value.replace(/[^\d+\s().-]/g, ''))}
              />
              <input
                className={ui.field}
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                placeholder="Edad (ayuda a priorizar la atención)"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
              {error && <p className={ui.error}>{error}</p>}
              <SubmitButton
                type="button"
                onClick={submit}
                pending={busy}
                disabled={!contact}
                pendingText="Enviando…"
                className="w-full"
              >
                Enviar
              </SubmitButton>
            </div>
          )}
        </section>
      ) : (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          Registramos tu solicitud. Mientras tanto, las líneas de arriba siguen disponibles.
        </p>
      )}

      <ConsentNotice />
    </main>
  );
}
