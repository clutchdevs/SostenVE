'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../src/lib/api-client';

const OPTIONS = [
  { value: 1, label: 'Estoy en crisis / en peligro ahora' },
  { value: 2, label: 'Muy mal, necesito ayuda pronto' },
  { value: 3, label: 'Regular, me cuesta el día a día' },
  { value: 4, label: 'Algo afectado, pero sobrellevo' },
  { value: 5, label: 'Quiero acompañamiento preventivo' },
];

export default function IntakePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function choose(value: number) {
    setLoading(true);
    try {
      const res = await apiFetch<{ rama: string }>('/intake/triage', {
        method: 'POST',
        auth: false,
        body: { respuesta_likert: value },
      });
      router.push(res.rama === 'roja' ? '/intake/roja' : '/intake/verde');
    } catch {
      // Fail-safe: if triage can't be reached, the most severe answers go to the
      // red branch (which shows crisis lines) — never under-route a person at risk.
      router.push(value <= 2 ? '/intake/roja' : '/intake/verde');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/" className="text-sm text-brand underline">
        ← Inicio
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-brand">¿Cómo te sientes en este momento?</h1>
      <p className="mt-2 text-slate-600">Toca la opción que más se parezca a ti.</p>
      <div className="mt-6 space-y-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={loading}
            onClick={() => choose(opt.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left font-medium shadow-sm hover:border-brand disabled:opacity-50"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </main>
  );
}
