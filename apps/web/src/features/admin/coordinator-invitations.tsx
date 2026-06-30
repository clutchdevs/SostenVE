'use client';

import { useState } from 'react';
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

/** Admin UI to invite coordinators by token (RF-2.6) and manage invitations. */
export function CoordinatorInvitations({ invitations, onChange }: Props) {
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastToken, setLastToken] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      onChange();
    } catch {
      setError('No se pudo completar la acción. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function invite() {
    const body = { nombre: form.nombre.trim(), email: form.email.trim() };
    return run(async () => {
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
    run(() => apiFetch(`/admin/coordinators/invitations/${inv.id}`, { method: 'DELETE' }));

  return (
    <section>
      <h2 className="text-lg font-semibold text-brand">Coordinadores</h2>
      <p className="mt-1 text-sm text-slate-600">
        Invita coordinadores por token (RF-2.6). El enlace de invitación se envía por correo; el token
        también se muestra aquí una sola vez para compartirlo manualmente si hace falta.
      </p>

      {error && <p className="mt-3 text-sm text-risk-high">{error}</p>}

      {lastToken && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-800">Token de invitación (cópialo ahora):</p>
          <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs">{lastToken}</code>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {invitations.map((inv) => (
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
                  className="rounded-md border border-risk-high px-3 py-1 text-sm font-medium text-risk-high hover:bg-red-50 disabled:opacity-50"
                >
                  Revocar
                </button>
              )}
            </div>
          </li>
        ))}
        {invitations.length === 0 && (
          <li className="text-sm text-slate-500">No hay invitaciones.</li>
        )}
      </ul>

      <form
        className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4"
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
          La sesión del coordinador caduca tras {SESSION_IDLE_TIMEOUT_MINUTES} minutos de inactividad
          (RF-2.7).
        </p>
        <button
          type="submit"
          disabled={busy}
          className="mt-3 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Invitar coordinador
        </button>
      </form>
    </section>
  );
}
