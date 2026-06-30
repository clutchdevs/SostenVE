'use client';

import { useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import type { CrisisLineAdmin } from '../../lib/types';

interface Props {
  lines: CrisisLineAdmin[];
  onChange: () => void;
}

const EMPTY = { nombre: '', telefono: '', cobertura: '', hora_inicio: '', hora_fin: '', prioridad: '' };

/** Admin CRUD for crisis lines (create, toggle active, soft-delete). */
export function CrisisLinesAdmin({ lines, onChange }: Props) {
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  function create() {
    const body: Record<string, unknown> = { nombre: form.nombre.trim(), telefono: form.telefono.trim() };
    if (form.cobertura.trim()) body.cobertura = form.cobertura.trim();
    if (form.hora_inicio !== '') body.hora_inicio = Number(form.hora_inicio);
    if (form.hora_fin !== '') body.hora_fin = Number(form.hora_fin);
    if (form.prioridad !== '') body.prioridad = Number(form.prioridad);
    return run(async () => {
      await apiFetch('/admin/crisis-lines', { method: 'POST', body });
      setForm({ ...EMPTY });
    });
  }

  const toggle = (line: CrisisLineAdmin) =>
    run(() =>
      apiFetch(`/admin/crisis-lines/${line.id}`, { method: 'PATCH', body: { activa: !line.activa } }),
    );

  const remove = (line: CrisisLineAdmin) =>
    run(() => apiFetch(`/admin/crisis-lines/${line.id}`, { method: 'DELETE' }));

  function window(line: CrisisLineAdmin): string {
    if (line.hora_inicio == null || line.hora_fin == null) return 'Respaldo';
    return `${line.hora_inicio}:00–${line.hora_fin % 24}:00`;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-brand">Líneas de crisis</h2>
      <p className="mt-1 text-sm text-slate-600">
        Fuente del ruteo público. Desactivar una línea la oculta del ruteo (soft-delete, auditado).
      </p>

      {error && <p className="mt-3 text-sm text-risk-high">{error}</p>}

      <ul className="mt-4 space-y-2">
        {lines.map((line) => (
          <li
            key={line.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3"
          >
            <div>
              <p className="font-medium">
                {line.nombre}{' '}
                <span className="text-sm font-normal text-slate-500">· {line.telefono}</span>
              </p>
              <p className="text-xs text-slate-500">
                {window(line)} · prioridad {line.prioridad}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  line.activa ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {line.activa ? 'Activa' : 'Inactiva'}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => toggle(line)}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                {line.activa ? 'Desactivar' : 'Activar'}
              </button>
              {line.activa && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(line)}
                  className="rounded-md border border-risk-high px-3 py-1 text-sm font-medium text-risk-high hover:bg-red-50 disabled:opacity-50"
                >
                  Eliminar
                </button>
              )}
            </div>
          </li>
        ))}
        {lines.length === 0 && <li className="text-sm text-slate-500">No hay líneas registradas.</li>}
      </ul>

      <form
        className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <h3 className="text-sm font-semibold">Nueva línea</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            required
            className="rounded-md border px-3 py-2"
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <input
            required
            className="rounded-md border px-3 py-2"
            placeholder="Teléfono"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
          <input
            className="rounded-md border px-3 py-2"
            placeholder="Cobertura (opcional)"
            value={form.cobertura}
            onChange={(e) => setForm({ ...form, cobertura: e.target.value })}
          />
          <input
            type="number"
            min={0}
            className="rounded-md border px-3 py-2"
            placeholder="Prioridad (opcional)"
            value={form.prioridad}
            onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
          />
          <input
            type="number"
            min={0}
            max={26}
            className="rounded-md border px-3 py-2"
            placeholder="Hora inicio (0–26, opcional)"
            value={form.hora_inicio}
            onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
          />
          <input
            type="number"
            min={0}
            max={26}
            className="rounded-md border px-3 py-2"
            placeholder="Hora fin (0–26, opcional)"
            value={form.hora_fin}
            onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Con hora inicio y fin la línea enruta por hora; sin ellas es línea de respaldo.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="mt-3 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Crear línea
        </button>
      </form>
    </section>
  );
}
