'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../src/lib/api-client';
import { ConsentNotice } from '../../src/components/consent-notice';
import { ui } from '../../src/lib/ui';

interface PapGuide {
  id: string;
  title: string;
  summary: string;
  steps: string[];
}

interface PapGuides {
  version: string;
  updated_at: string;
  guides: PapGuide[];
}

export default function PapGuidesPage() {
  const [data, setData] = useState<PapGuides | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<PapGuides>('/pap', { auth: false })
      .then(setData)
      .catch(() => setError('No se pudieron cargar las guías. Intenta de nuevo.'));
  }, []);

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-8">
      <Link href="/" className={ui.link}>
        ← Inicio
      </Link>
      <header>
        <h1 className={`text-2xl ${ui.heading}`}>Guías de autoayuda</h1>
        <p className={`mt-2 ${ui.muted}`}>
          Primeros Auxilios Psicológicos para acompañarte mientras llega el apoyo. Léelas a tu
          ritmo, cuando lo necesites.
        </p>
      </header>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Estas guías son de autoayuda y <strong>no reemplazan</strong> la atención profesional. Si
        hay riesgo para tu vida, usa las{' '}
        <Link href="/intake/roja" className="font-semibold text-risk-high underline">
          líneas de crisis
        </Link>
        .
      </div>

      {error && <p className={ui.error}>{error}</p>}

      <div className="space-y-3">
        {data?.guides.map((guide) => (
          <details key={guide.id} className={`group p-4 ${ui.card}`}>
            <summary className="cursor-pointer list-none">
              <span className="font-semibold text-ppv-blue">{guide.title}</span>
              <p className={`mt-1 ${ui.muted}`}>{guide.summary}</p>
            </summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
              {guide.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </details>
        ))}
        {!data && !error && <p className="text-sm text-slate-500">Cargando guías…</p>}
      </div>

      <ConsentNotice />
    </main>
  );
}
