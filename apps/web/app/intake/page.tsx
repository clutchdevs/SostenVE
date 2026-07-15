'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../src/lib/api-client';
import { ConsentNotice } from '../../src/components/consent-notice';
import { ui } from '../../src/lib/ui';
import { saveDraft, INTAKE_LIKERT_KEY } from '../../src/lib/intake-draft';
import { URGENCY_OPTIONS } from '../../src/features/intake/urgency';

const OPTIONS = URGENCY_OPTIONS;

export default function IntakePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function choose(value: number) {
    setLoading(true);
    // Remember the answer so the red/green submit can persist it (#131).
    saveDraft<number>(INTAKE_LIKERT_KEY, value);
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
      <Link href="/" className={ui.link}>
        ← Inicio
      </Link>
      <h1 className={`mt-4 text-2xl ${ui.heading}`}>¿Cómo te sientes en este momento?</h1>
      <p className={`mt-2 ${ui.muted}`}>Toca la opción que más se parezca a ti.</p>
      <div className="mt-6 space-y-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={loading}
            onClick={() => choose(opt.value)}
            className={`w-full px-4 py-3.5 text-left font-medium text-ink transition-colors hover:border-ppv-blue disabled:opacity-50 ${ui.card}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className={`mt-6 text-center ${ui.muted}`}>
        Mientras tanto, puedes ver{' '}
        <Link href="/guias" className={`font-semibold ${ui.link}`}>
          guías de autoayuda
        </Link>
        .
      </p>

      <ConsentNotice />
    </main>
  );
}
