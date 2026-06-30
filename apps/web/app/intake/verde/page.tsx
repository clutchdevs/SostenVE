'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CrisisLinesPanel } from '../../../src/components/crisis-lines-panel';
import { TagPicker } from '../../../src/features/intake/tag-picker';
import { apiFetch } from '../../../src/lib/api-client';
import { FALLBACK_CRISIS_LINES, getCrisisLines } from '../../../src/lib/crisis-lines';

interface GreenResult {
  nivel_riesgo: string;
  lineas_crisis?: { activa: { name: string; phone: string } | null; respaldo: { name: string; phone: string }[] };
}

export default function GreenBranchPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [result, setResult] = useState<GreenResult | null>(null);
  const [escalatedLines, setEscalatedLines] = useState(FALLBACK_CRISIS_LINES);

  function toggle(code: string) {
    setSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function submit() {
    if (!contact) return;
    const res = await apiFetch<GreenResult>('/intake/green-branch', {
      method: 'POST',
      auth: false,
      body: { nombre: name || undefined, contacto: contact, tags: selected },
    });
    setResult(res);
    if (res.nivel_riesgo === 'riesgo_alto') {
      // Escalated to high risk: show crisis lines immediately.
      setEscalatedLines(await getCrisisLines());
    }
  }

  if (result) {
    return (
      <main className="mx-auto max-w-md px-4 py-8 space-y-4">
        {result.nivel_riesgo === 'riesgo_alto' && <CrisisLinesPanel lines={escalatedLines} />}
        <p className="rounded-lg bg-emerald-50 p-4 text-emerald-800">
          Recibimos tu solicitud. Un psicólogo voluntario te contactará. Si la situación empeora,
          usa las líneas de crisis.
        </p>
        <p className="text-center text-sm text-slate-600">
          Mientras esperas, puedes ver{' '}
          <Link href="/guias" className="font-semibold text-brand underline">
            guías de autoayuda
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 space-y-5">
      <h1 className="text-xl font-bold text-brand">Cuéntanos cómo te sientes</h1>
      <p className="text-slate-600">Toca lo que aplique a ti:</p>
      <TagPicker selected={selected} onToggle={toggle} />

      <div className="space-y-3">
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
          Enviar solicitud
        </button>
      </div>
    </main>
  );
}
