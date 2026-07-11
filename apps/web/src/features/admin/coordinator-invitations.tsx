'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Pagination } from '../../components/pagination';
import { Spinner } from '../../components/spinner';
import { apiFetch } from '../../lib/api-client';
import { SESSION_IDLE_TIMEOUT_MINUTES } from '../../lib/config';
import type { CoordinatorInvitationCreated, CoordinatorInvitationView } from '../../lib/types';

interface Props {
  invitations: CoordinatorInvitationView[];
  onChange: () => void;
}

const ESTADO_LABEL: Record<CoordinatorInvitationView['estado'], string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  revoked: 'Revocada',
};

const EMPTY = { nombre: '', email: '' };

/** Status filter, including an "all" pseudo-status. */
type StatusFilter = 'all' | CoordinatorInvitationView['estado'];

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'revoked', label: 'Revocadas' },
];

const PAGE_SIZE = 20;

/** Admin UI to invite coordinators by token (RF-2.6) and manage invitations. */
export function CoordinatorInvitations({ invitations, onChange }: Props) {
  const [form, setForm] = useState({ ...EMPTY });
  // Tracks which action is running ('invite' or an invitation id) so the spinner
  // shows on the exact button; any non-null value disables all actions.
  const [pending, setPending] = useState<string | null>(null);
  const busy = pending !== null;
  const [error, setError] = useState('');
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(id: string, action: () => Promise<unknown>) {
    setPending(id);
    setError('');
    try {
      await action();
      onChange();
    } catch {
      setError('No se pudo completar la acción. Intenta de nuevo.');
    } finally {
      setPending(null);
    }
  }

  function invite() {
    const body = { nombre: form.nombre.trim(), email: form.email.trim() };
    return run('invite', async () => {
      const created = await apiFetch<CoordinatorInvitationCreated>(
        '/admin/coordinators/invitations',
        { method: 'POST', body },
      );
      // Surface the raw token once so it can be shared if email is unavailable.
      setLastToken(created.token);
      setForm({ ...EMPTY });
    });
  }

  const revoke = (inv: CoordinatorInvitationView) =>
    run(inv.id, () => apiFetch(`/admin/coordinators/invitations/${inv.id}`, { method: 'DELETE' }));

  // Full activation link to share out-of-band when email delivery is unavailable.
  const inviteLink =
    lastToken && typeof window !== 'undefined'
      ? `${window.location.origin}/registro-coordinador?token=${lastToken}`
      : '';

  async function copyInviteLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — the link is selectable below.
    }
  }

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invitations.filter((inv) => {
      if (statusFilter !== 'all' && inv.estado !== statusFilter) return false;
      if (q && !`${inv.nombre} ${inv.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [invitations, statusFilter, search]);

  // Reset to the first page whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // Paginate the filtered list. `page` is clamped derivedly so revoking the last
  // row on a page (or switching filters) never leaves us on an empty page.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const filtersActive = search.trim() !== '' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  return (
    <section>
      <h1 className="font-serif text-3xl font-semibold text-ink">Coordinadores</h1>
      <p className="mt-1 text-sm text-slate-600">
        Invita coordinadores por token. El enlace de invitación se envía por correo; el token
        también se muestra aquí una sola vez para compartirlo manualmente si hace falta.
      </p>

      {error && <p className="mt-3 text-sm text-risk-high">{error}</p>}

      {lastToken && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-amber-900">Invitación creada ✓</p>
          <p className="mt-1 text-amber-800">
            Se envió un correo con el enlace de activación. Si no llega, comparte este enlace
            con la persona para que active su cuenta de coordinador:
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1 text-xs">
              {inviteLink || `…/registro-coordinador?token=${lastToken}`}
            </code>
            <button
              type="button"
              onClick={copyInviteLink}
              className="shrink-0 rounded-md border border-amber-400 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              {copied ? 'Copiado ✓' : 'Copiar enlace'}
            </button>
          </div>
          <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-amber-800">
            <li>La persona abre el enlace.</li>
            <li>Completa sus datos y define una contraseña (mínimo 8 caracteres).</li>
            <li>Inicia sesión en <code className="rounded bg-white px-1">/login</code> como coordinador.</li>
          </ol>
          <p className="mt-2 text-xs text-amber-700">
            El enlace es de un solo uso y caduca. Puedes revocar la invitación mientras esté pendiente.
          </p>
        </div>
      )}

      {/* New-invitation form kept ABOVE the list so it stays visible and doesn't
          get pushed below the fold as the list of invitations grows. */}
      <form
        className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void invite();
        }}
      >
        <h3 className="text-sm font-semibold">Nueva invitación</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            required
            className="rounded-md border px-3 py-2"
            placeholder="Nombre completo"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <input
            required
            type="email"
            className="rounded-md border px-3 py-2"
            placeholder="Correo"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          La sesión del coordinador caduca tras {SESSION_IDLE_TIMEOUT_MINUTES} minutos de inactividad.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending === 'invite' && <Spinner />}
          {pending === 'invite' ? 'Invitando…' : 'Invitar coordinador'}
        </button>
      </form>

      <h2 className="mt-8 text-sm font-semibold text-slate-600">Invitaciones</h2>

      {/* Search + status filters, in the same card layout as the padrón
          (apps/web/app/admin/padron/page.tsx) to keep the admin UI consistent. */}
      <div className="mt-3 space-y-4 rounded-2xl border border-slate-200/80 bg-surface-card p-4 shadow-card">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
            aria-label="Buscar invitaciones"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'border-navy bg-navy text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" aria-hidden />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {pageItems.map((inv) => (
          <li
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3"
          >
            <div>
              <p className="font-medium">
                {inv.nombre}{' '}
                <span className="text-sm font-normal text-slate-500">· {inv.email}</span>
              </p>
              <p className="text-xs text-slate-500">
                Vence {new Date(inv.vence_en).toLocaleString('es-VE')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  inv.estado === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : inv.estado === 'accepted'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {ESTADO_LABEL[inv.estado]}
              </span>
              {inv.estado === 'pending' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => revoke(inv)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-risk-high px-3 py-1 text-sm font-medium text-risk-high hover:bg-red-50 disabled:opacity-50"
                >
                  {pending === inv.id && <Spinner />}
                  {pending === inv.id ? 'Revocando…' : 'Revocar'}
                </button>
              )}
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-sm text-slate-500">
            {filtersActive
              ? 'No hay invitaciones que coincidan con los filtros.'
              : 'No hay invitaciones.'}
          </li>
        )}
      </ul>

      {filtered.length > 0 && (
        <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
      )}
    </section>
  );
}
