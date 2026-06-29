'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CaseList } from '../../src/features/shared/case-list';
import { apiFetch } from '../../src/lib/api-client';
import type { CaseSummary } from '../../src/lib/types';

export default function PsychologistHome() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<CaseSummary[]>('/cases')
      .then(setCases)
      .catch(() => setError('No se pudieron cargar los casos. ¿Iniciaste sesión?'));
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-bold text-brand">Mis casos</h1>
      {error && <p className="mt-4 text-risk-high">{error}</p>}
      <div className="mt-6">
        <CaseList cases={cases} onOpen={(id) => router.push(`/psicologo/casos/${id}`)} />
      </div>
    </main>
  );
}
