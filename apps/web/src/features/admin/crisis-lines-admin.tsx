'use client';

import { useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import type { CrisisLineAdmin } from '../../lib/types';

interface Props {
  lines: CrisisLineAdmin[];
  onChange: () => void;
}

const EMPTY = { nombre: '', telefono: '', cobertura: '', hora_inicio: '', hora_fin: '', prioridad: '' };
type LineForm = typeof EMPTY;

/** Admin CRUD for crisis lines (create, edit in place, toggle active, soft-delete). */
export function CrisisLinesAdmin({ lines, onChange }: Props) {
  const [form, setForm] = useState<LineForm>({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LineForm>({ ...EMPTY });
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

  /** Builds the request body from a form, sending null to clear optional fields. */
  function toBody(f: LineForm): Record<string, unknown> {
    const body: Record<string, unknown> = {
      nombre: f.nombre.trim(),
      telefono: f.telefono.trim(),
      cobertura: f.cobertura.trim() || null,
      hora_inicio: f.hora_inicio === '' ? null : Number(f.hora_inicio),
      hora_fin: f.hora_fin === '' ? null : Number(f.hora_fin),
    };
    if (f.prioridad !== '') body.prioridad = Number(f.prioridad);
    return body;
  }

  function create() {
    const body = toBody(form);
    // Create omits null optionals (they carry no meaning on a brand-new line).
    for (const k of ['cobertura', 'hora_inicio', 'hora_fin'] as const) {
      if (body[k] === null) delete body[k];
    }
    return run(async () => {
      await apiFetch('/admin/crisis-lines', { method: 'POST', body });
      setForm({ ...EMPTY });
    });
  }

  function startEdit(line: CrisisLineAdmin) {
    setEditingId(line.id);
    setError('');
    setEditForm({
      nombre: line.nombre,
      telefono: line.telefono,
      cobertura: line.cobertura ?? '',
      hora_inicio: line.hora_inicio == null ? '' : String(line.hora_inicio),
      hora_fin: line.hora_fin == null ? '' : String(line.hora_fin),
      prioridad: line.prioridad == null ? '' : String(line.prioridad),
    });
  }

  function saveEdit(id: string) {
    if (!editForm.nombre.trim() || !editForm.telefono.trim()) {
      setError('El nombre y el teléfono son obligatorios.');
      return;
    }
    return run(async () => {
      await apiFetch(`/admin/crisis-lines/${id}`, { method: 'PATCH', body: toBody(editForm) });
      setEditingId(null);
    });
  }

  const toggle = (line: CrisisLineAdmin) =>
    run(() =>
      apiFetch(`/admin/crisis-lines/${line.id}`, { method: 'PATCH', body: { activa: !line.activa } }),
    );

  const remove = (line: CrisisLineAdmin) =>
    run(() => apiFetch(`/admin/crisis-lines/${line.id}`, { method: 'DELETE' }));

  function windowLabel(line: CrisisLineAdmin): string {
    if (line.hora_inicio == null || line.hora_fin == null) return 'Respaldo';
    return `${line.hora_inicio}:00–${line.hora_fin % 24}:00`;
  }

  /** Shared field grid for the create form and the inline edit form. */
  function Fields({ value, onField }: { value: LineForm; onField: (patch: Partial<LineForm>) => void }) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          required
          className="rounded-md border px-3 py-2"
          placeholder="Nombre"
          value={value.nombre}
          onChange={(e) => onField({ nombre: e.target.value })}
        />
        <input
          required
          className="rounded-md border px-3 py-2"
          placeholder="Teléfono"
          value={value.telefono}
          onChange={(e) => onField({ telefono: e.target.value })}
        />
        <input
          className="rounded-md border px-3 py-2"
          placeholder="Cobertura (opcional)"
          value={value.cobertura}
          onChange={(e) => onField({ cobertura: e.target.value })}
        />
        <input
          type="number"
          min={0}
          className="rounded-md border px-3 py-2"
          placeholder="Prioridad (opcional)"
          value={value.prioridad}
          onChange={(e) => onField({ prioridad: e.target.value })}
        />
        <input
          type="number"
          min={0}
          max={26}
          className="rounded-md border px-3 py-2"
          placeholder="Hora inicio (0–26, opcional)"
          value={value.hora_inicio}
          onChange={(e) => onField({ hora_inicio: e.target.value })}
        />
        <input
          type="number"
          min={0}
          max={26}
          className="rounded-md border px-3 py-2"
          placeholder="Hora fin (0–26, opcional)"
          value={value.hora_fin}
          onChange={(e) => onField({ hora_fin: e.target.value })}
        />
      </div>
    );
  }

  return (
    <section>
      <h1 className="font-serif text-3xl font-semibold text-ink">Líneas de crisis</h1>
      <p className="mt-1 text-sm text-slate-600">
        Fuente del ruteo público. Editar cambia los datos en el momento; desactivar oculta la línea del
        ruteo (soft-delete, auditado).
      </p>

      {error && <p className="mt-3 text-sm text-risk-high">{error}</p>}

      <ul className="mt-4 space-y-2">
        {lines.map((line) =>
          editingId === line.id ? (
            <li key={line.id} className="rounded-lg border border-brand/40 bg-brand/5 p-3">
              <h3 className="mb-3 text-sm font-semibold text-ink">Editar “{line.nombre}”</h3>
              <Fields value={editForm} onField={(patch) => setEditForm({ ...editForm, ...patch })} />
              <p className="mt-2 text-xs text-slate-500">
                Con hora inicio y fin la línea enruta por hora; vacías = línea de respaldo.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => saveEdit(line.id)}
                  className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  Guardar cambios
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditingId(null)}
                  className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </li>
          ) : (
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
                  {windowLabel(line)} · prioridad {line.prioridad}
                  {line.cobertura ? ` · ${line.cobertura}` : ''}
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
                  onClick={() => startEdit(line)}
                  className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Editar
                </button>
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
          ),
        )}
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
        <div className="mt-3">
          <Fields value={form} onField={(patch) => setForm({ ...form, ...patch })} />
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
