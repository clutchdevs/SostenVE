'use client';

import { useState } from 'react';
import { Spinner } from '../../components/spinner';
import { apiFetch } from '../../lib/api-client';
import { formatPhoneDisplay } from '../../lib/validation';
import type { CrisisLineAdmin } from '../../lib/types';

interface Props {
  lines: CrisisLineAdmin[];
  onChange: () => void;
}

const EMPTY = {
  nombre: '',
  telefono: '',
  cobertura: '',
  hora_inicio: '',
  hora_fin: '',
  dias_semana: [] as string[],
  prioridad: '',
};
type LineForm = typeof EMPTY;

const DIAS = [
  ['lunes', 'Lun'],
  ['martes', 'Mar'],
  ['miercoles', 'Mié'],
  ['jueves', 'Jue'],
  ['viernes', 'Vie'],
  ['sabado', 'Sáb'],
  ['domingo', 'Dom'],
] as const;

function toggleDay(days: string[], day: string): string[] {
  return days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
}

// Whole clock hours 0–23 for the time selectors, always shown in unambiguous 24h
// "HH:00" (no device-dependent 12h/AM-PM). A window that crosses midnight uses
// end <= start; an hourless line (empty) is an always-visible backup.
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourLabel = (h: number | string) => `${String(Number(h)).padStart(2, '0')}:00`;

/**
 * Validates the hour pair: both set or neither (a window needs both ends), and
 * start != end (equal hours are ambiguous — "8 a 8"). Returns an error message,
 * or null when valid.
 */
function hoursError(f: { hora_inicio: string; hora_fin: string }): string | null {
  const startSet = f.hora_inicio !== '';
  const endSet = f.hora_fin !== '';
  if (startSet !== endSet) return 'Indica ambas horas (inicio y fin) o déjalas vacías.';
  if (startSet && endSet && f.hora_inicio === f.hora_fin) {
    return 'La hora de inicio y de fin no pueden ser iguales. Para 24 horas, usa 00:00 a 24:00.';
  }
  return null;
}

/** Shared field grid for the create form and the inline edit form. Defined at module
 * level (not inside CrisisLinesAdmin) so React doesn't remount the inputs — and drop
 * focus — on every keystroke. */
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
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Hora de inicio (opcional)
        <select
          className="rounded-md border px-3 py-2 text-ink"
          aria-label="Hora de inicio"
          value={value.hora_inicio}
          onChange={(e) => onField({ hora_inicio: e.target.value })}
        >
          <option value="">—</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Hora de fin (opcional)
        <select
          className="rounded-md border px-3 py-2 text-ink"
          aria-label="Hora de fin"
          value={value.hora_fin}
          onChange={(e) => onField({ hora_fin: e.target.value })}
        >
          <option value="">—</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </select>
      </label>
      <p className="col-span-full text-xs text-slate-500">
        Déjalas vacías para una línea de <strong>respaldo</strong> (siempre visible). Para una línea
        que <strong>cruza la medianoche</strong>, pon la hora de fin <strong>menor</strong> que la de
        inicio (p. ej. 20:00 a 02:00).
      </p>
      <fieldset className="col-span-full">
        <legend className="text-sm text-slate-700">Días de la semana (vacío = todos los días)</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {DIAS.map(([dia, label]) => (
            <label
              key={dia}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs"
            >
              <input
                type="checkbox"
                checked={value.dias_semana.includes(dia)}
                onChange={() => onField({ dias_semana: toggleDay(value.dias_semana, dia) })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/** Admin CRUD for crisis lines (create, edit in place, toggle active, soft-delete). */
export function CrisisLinesAdmin({ lines, onChange }: Props) {
  const [form, setForm] = useState<LineForm>({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LineForm>({ ...EMPTY });
  // Which action is running (e.g. 'create', `edit:<id>`, `toggle:<id>`) so the
  // spinner shows on the exact button; any non-null value disables all actions.
  const [pending, setPending] = useState<string | null>(null);
  const busy = pending !== null;
  const [error, setError] = useState('');

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

  /** Builds the request body from a form, sending null to clear optional fields. */
  function toBody(f: LineForm): Record<string, unknown> {
    const body: Record<string, unknown> = {
      nombre: f.nombre.trim(),
      telefono: f.telefono.trim(),
      cobertura: f.cobertura.trim() || null,
      hora_inicio: f.hora_inicio === '' ? null : Number(f.hora_inicio),
      hora_fin: f.hora_fin === '' ? null : Number(f.hora_fin),
      dias_semana: f.dias_semana.length === 0 ? null : f.dias_semana,
    };
    if (f.prioridad !== '') body.prioridad = Number(f.prioridad);
    return body;
  }

  function create() {
    const he = hoursError(form);
    if (he) {
      setError(he);
      return;
    }
    const body = toBody(form);
    // Create omits null optionals (they carry no meaning on a brand-new line).
    for (const k of ['cobertura', 'hora_inicio', 'hora_fin', 'dias_semana'] as const) {
      if (body[k] === null) delete body[k];
    }
    return run('create', async () => {
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
      dias_semana: line.dias_semana ?? [],
      prioridad: line.prioridad == null ? '' : String(line.prioridad),
    });
  }

  function saveEdit(id: string) {
    if (!editForm.nombre.trim() || !editForm.telefono.trim()) {
      setError('El nombre y el teléfono son obligatorios.');
      return;
    }
    const he = hoursError(editForm);
    if (he) {
      setError(he);
      return;
    }
    return run(`edit:${id}`, async () => {
      await apiFetch(`/admin/crisis-lines/${id}`, { method: 'PATCH', body: toBody(editForm) });
      setEditingId(null);
    });
  }

  const toggle = (line: CrisisLineAdmin) =>
    run(`toggle:${line.id}`, () =>
      apiFetch(`/admin/crisis-lines/${line.id}`, { method: 'PATCH', body: { activa: !line.activa } }),
    );

  function remove(line: CrisisLineAdmin) {
    // Permanent, irreversible — confirm before deleting (use Desactivar to hide
    // a line reversibly).
    if (
      !window.confirm(
        `¿Eliminar definitivamente la línea "${line.nombre}"? Esta acción no se puede deshacer. Si solo quieres ocultarla del ruteo, usa "Desactivar".`,
      )
    ) {
      return;
    }
    run(`remove:${line.id}`, () => apiFetch(`/admin/crisis-lines/${line.id}`, { method: 'DELETE' }));
  }

  function windowLabel(line: CrisisLineAdmin): string {
    const hours =
      line.hora_inicio == null || line.hora_fin == null
        ? 'Respaldo'
        : `${hourLabel(line.hora_inicio)}–${hourLabel(line.hora_fin)}`;
    if (!line.dias_semana || line.dias_semana.length === 0) return hours;
    const days = DIAS.filter(([dia]) => line.dias_semana?.includes(dia))
      .map(([, label]) => label)
      .join('/');
    return `${hours} · ${days}`;
  }

  return (
    <section>
      <h1 className="font-serif text-3xl font-semibold text-ink">Líneas de crisis</h1>

      {error && <p className="mt-3 text-sm text-risk-high">{error}</p>}

      {/* Create form kept ABOVE the list so it stays visible and doesn't get
          pushed off-screen as more lines are added. */}
      <form
        className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
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
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending === 'create' && <Spinner />}
          {pending === 'create' ? 'Creando…' : 'Crear línea'}
        </button>
      </form>

      <h2 className="mt-8 text-sm font-semibold text-slate-600">Líneas registradas</h2>
      <p className="mt-1 text-xs text-slate-500">
        Fuente del ruteo público. <strong>Desactivar</strong> la oculta del ruteo pero la conserva
        (reversible); <strong>eliminar</strong> la borra definitivamente. Todo queda auditado.
      </p>
      <ul className="mt-3 space-y-2">
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
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {pending === `edit:${line.id}` && <Spinner />}
                  {pending === `edit:${line.id}` ? 'Guardando…' : 'Guardar cambios'}
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
                  <span className="text-sm font-normal text-slate-500">
                    · {formatPhoneDisplay(line.telefono)}
                  </span>
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
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  {pending === `toggle:${line.id}` && <Spinner />}
                  {line.activa ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(line)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-risk-high px-3 py-1 text-sm font-medium text-risk-high hover:bg-red-50 disabled:opacity-50"
                >
                  {pending === `remove:${line.id}` && <Spinner />}
                  {pending === `remove:${line.id}` ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </li>
          ),
        )}
        {lines.length === 0 && <li className="text-sm text-slate-500">No hay líneas registradas.</li>}
      </ul>
    </section>
  );
}
