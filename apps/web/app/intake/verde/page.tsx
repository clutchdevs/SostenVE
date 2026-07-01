'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CrisisLinesPanel } from '../../../src/components/crisis-lines-panel';
import { ConsentNotice } from '../../../src/components/consent-notice';
import { TagPicker } from '../../../src/features/intake/tag-picker';
import {
  buildGreenPayload,
  EMPTY_GREEN_FORM,
  HABIT_CHANGES,
  VENEZUELA_STATES,
  type GreenFormState,
} from '../../../src/features/intake/green-form';
import { apiFetch, ApiError } from '../../../src/lib/api-client';
import { FALLBACK_CRISIS_LINES, getCrisisLines } from '../../../src/lib/crisis-lines';
import { clearDraft, INTAKE_DRAFT_KEYS, loadDraft, saveDraft } from '../../../src/lib/intake-draft';
import { enqueueSubmission } from '../../../src/lib/intake-outbox';

interface GreenResult {
  nivel_riesgo: string;
  lineas_crisis?: { activa: { name: string; phone: string } | null; respaldo: { name: string; phone: string }[] };
}

interface GreenDraft {
  step: number;
  form: GreenFormState;
}

const STEPS = ['Síntomas', 'Ubicación', 'Hábitos', 'Contacto'] as const;

export default function GreenBranchPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<GreenFormState>(EMPTY_GREEN_FORM);
  const [result, setResult] = useState<GreenResult | null>(null);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState('');
  const [escalatedLines, setEscalatedLines] = useState(FALLBACK_CRISIS_LINES);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore any draft saved on a previous (possibly offline) visit, then start
  // persisting changes. Hydration happens in an effect to avoid an SSR mismatch.
  useEffect(() => {
    const draft = loadDraft<GreenDraft>(INTAKE_DRAFT_KEYS.verde);
    if (draft) {
      setForm(draft.form);
      setStep(draft.step);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDraft<GreenDraft>(INTAKE_DRAFT_KEYS.verde, { step, form });
  }, [hydrated, step, form]);

  function update(patch: Partial<GreenFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }
  function toggle(key: 'tags' | 'habitChanges', code: string) {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(code) ? prev[key].filter((c) => c !== code) : [...prev[key], code],
    }));
  }

  async function submit() {
    if (!form.contact.trim()) return;
    setBusy(true);
    setError('');
    const payload = buildGreenPayload(form);
    try {
      const res = await apiFetch<GreenResult>('/intake/green-branch', {
        method: 'POST',
        auth: false,
        body: payload,
      });
      clearDraft(INTAKE_DRAFT_KEYS.verde);
      setResult(res);
      if (res.nivel_riesgo === 'riesgo_alto') setEscalatedLines(await getCrisisLines());
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        // The server rejected the data; retrying as-is won't help.
        setError('No pudimos procesar tu solicitud. Revisa los datos e intenta de nuevo.');
      } else {
        // No/degraded connection or server error: queue it and retry later so
        // nothing captured is lost.
        enqueueSubmission('/intake/green-branch', payload);
        clearDraft(INTAKE_DRAFT_KEYS.verde);
        setQueued(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (result || queued) {
    return (
      <main className="mx-auto max-w-md space-y-4 px-4 py-8">
        {result?.nivel_riesgo === 'riesgo_alto' && <CrisisLinesPanel lines={escalatedLines} />}
        <p className="rounded-lg bg-emerald-50 p-4 text-emerald-800">
          {queued
            ? 'Guardamos tu solicitud en este dispositivo y la enviaremos automáticamente cuando vuelva la conexión. Si es una emergencia, usa las líneas de crisis.'
            : 'Recibimos tu solicitud. Un psicólogo voluntario te contactará. Si la situación empeora, usa las líneas de crisis.'}
        </p>
        <p className="text-center text-sm text-slate-600">
          Mientras esperas, puedes ver{' '}
          <Link href="/guias" className="font-semibold text-brand underline">
            guías de autoayuda
          </Link>
          .
        </p>
        <ConsentNotice />
      </main>
    );
  }

  const isLast = step === STEPS.length - 1;

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Paso {step + 1} de {STEPS.length} · {STEPS[step]}
        </p>
        <div className="mt-2 flex gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      </div>

      {step === 0 && (
        <section className="space-y-3">
          <h1 className="text-xl font-bold text-brand">Cuéntanos cómo te sientes</h1>
          <p className="text-slate-600">Toca lo que aplique a ti:</p>
          <TagPicker selected={form.tags} onToggle={(c) => toggle('tags', c)} />
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <h1 className="text-xl font-bold text-brand">¿Dónde te encuentras?</h1>
          <p className="text-slate-600">Nos ayuda a orientar el apoyo en tu zona.</p>
          <label className="block text-sm font-medium text-slate-700">
            Estado
            <select
              className="mt-1 w-full rounded-md border bg-white px-3 py-2"
              value={form.estado}
              onChange={(e) => update({ estado: e.target.value })}
            >
              <option value="">Selecciona tu estado…</option>
              {VENEZUELA_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Ciudad (opcional)
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="Tu ciudad o municipio"
              value={form.ciudad}
              onChange={(e) => update({ ciudad: e.target.value })}
            />
          </label>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <h1 className="text-xl font-bold text-brand">¿Notaste cambios recientes?</h1>
          <p className="text-slate-600">Marca lo que haya cambiado desde el sismo (opcional):</p>
          <div className="space-y-2">
            {HABIT_CHANGES.map((h) => {
              const on = form.habitChanges.includes(h.code);
              return (
                <button
                  key={h.code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle('habitChanges', h.code)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
                    on ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded border ${
                      on ? 'border-brand bg-brand text-white' : 'border-slate-300'
                    }`}
                    aria-hidden
                  >
                    {on ? '✓' : ''}
                  </span>
                  {h.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          <h1 className="text-xl font-bold text-brand">¿Cómo te contactamos?</h1>
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Nombre (opcional)"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
          />
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Teléfono de contacto"
            value={form.contact}
            onChange={(e) => update({ contact: e.target.value })}
          />
        </section>
      )}

      {error && <p className="text-sm text-risk-high">{error}</p>}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
        >
          Atrás
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={submit}
            disabled={!form.contact.trim() || busy}
            className="rounded-md bg-brand px-5 py-2 font-medium text-white disabled:opacity-50"
          >
            Enviar solicitud
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="rounded-md bg-brand px-5 py-2 font-medium text-white"
          >
            Siguiente
          </button>
        )}
      </div>

      <ConsentNotice />
    </main>
  );
}
