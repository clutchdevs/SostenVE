'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { API_BASE_URL, ApiError, apiFetch } from '../../lib/api-client';
import { getToken } from '../../lib/session';
import { Pagination } from '../../components/pagination';
import { RowSkeleton } from '../../components/skeleton';
import type { ClosedCaseReportPage } from '../../lib/types';

const PAGE_SIZE = 25;

const RISK_TABS = [
  { key: '', label: 'Todos' },
  { key: 'riesgo_alto', label: 'Riesgo alto' },
  { key: 'riesgo_moderado', label: 'Riesgo moderado' },
  { key: 'seguimiento', label: 'Seguimiento' },
];

/** Confidentiality + accountability notice, served from versioned config (issue #169). */
function Disclaimer() {
  const [notice, setNotice] = useState<{ text: string } | null>(null);
  useEffect(() => {
    apiFetch<{ version: string; text: string }>('/consent/reports', { auth: false })
      .then(setNotice)
      .catch(() => setNotice(null));
  }, []);
  if (!notice) return null;

  const [title, ...paragraphs] = notice.text.trim().split('\n\n');
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <h2 className="text-sm font-semibold text-amber-900">{title}</h2>
      <div className="mt-2 space-y-2 text-xs leading-relaxed text-amber-900/90">
        {paragraphs.map((p) => (
          <p key={p.slice(0, 40)}>{p.replace(/\n/g, ' ')}</p>
        ))}
      </div>
    </section>
  );
}

/** Builds the shared query string so the table and the download always agree. */
function buildQuery(risk: string, from: string, to: string, offset: number, limit: number): string {
  const params = new URLSearchParams();
  if (risk) params.set('nivel_riesgo', risk);
  if (from) params.set('desde', from);
  if (to) params.set('hasta', to);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return params.toString();
}

export function ClosedCasesReport({ onAuthError }: { onAuthError: () => void }) {
  const [risk, setRisk] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ClosedCaseReportPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = buildQuery(risk, from, to, (page - 1) * PAGE_SIZE, PAGE_SIZE);
      setData(await apiFetch<ClosedCaseReportPage>(`/reports/closed-cases?${query}`));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) onAuthError();
      else setError('No se pudo cargar el reporte de casos cerrados.');
    } finally {
      setLoading(false);
    }
  }, [risk, from, to, page, onAuthError]);

  useEffect(() => {
    void load();
  }, [load]);

  // The CSV needs the auth header and arrives as a file, so it cannot go through
  // apiFetch (which parses JSON). Same filters as the table, minus pagination.
  async function download() {
    setDownloading(true);
    setError('');
    try {
      const query = buildQuery(risk, from, to, 0, 5000);
      const res = await fetch(`${API_BASE_URL}/reports/closed-cases.csv?${query}`, {
        headers: { Authorization: `Bearer ${getToken() ?? ''}`, 'X-Active-Role': 'coordinator' },
      });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-casos-cerrados-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo descargar el archivo.');
    } finally {
      setDownloading(false);
    }
  }

  const rows = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <section className="space-y-4">
      <Disclaimer />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {RISK_TABS.map((tab) => (
            <button
              key={tab.key || 'todos'}
              type="button"
              onClick={() => {
                setRisk(tab.key);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                tab.key === risk
                  ? 'border-navy bg-navy text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="text-xs text-slate-600">
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-sm text-ink"
          />
        </label>
        <label className="text-xs text-slate-600">
          Hasta
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-sm text-ink"
          />
        </label>

        <button
          type="button"
          onClick={() => void download()}
          disabled={downloading || rows.length === 0}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-navy bg-navy px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          {downloading ? 'Descargando…' : 'Descargar CSV'}
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-risk-high">
          {error}
        </p>
      )}

      {loading ? (
        <RowSkeleton />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
          No hay casos cerrados con estos filtros.
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-600">
            {data?.total} caso{data?.total === 1 ? '' : 's'} cerrado{data?.total === 1 ? '' : 's'}
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2">Cerrado</th>
                  <th className="px-3 py-2">Riesgo</th>
                  <th className="px-3 py-2">Psicólogo</th>
                  <th className="px-3 py-2">Contacto</th>
                  <th className="px-3 py-2">Motivo de cierre</th>
                  <th className="px-3 py-2">Derivación</th>
                  <th className="px-3 py-2 text-right">Minutos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.casoId} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-700">
                      {new Date(row.cerradoEn).toLocaleDateString('es-VE')}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.nivelRiesgo}</td>
                    <td className="px-3 py-2 text-slate-700">{row.psicologo ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.contacto ? 'Sí' : 'No'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.motivoCierre ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.derivacionTipo ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{row.minutos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </section>
  );
}
