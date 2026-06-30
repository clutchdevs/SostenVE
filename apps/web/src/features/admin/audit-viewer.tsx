'use client';

import type { AuditEntryView } from '../../lib/types';

interface Props {
  entries: AuditEntryView[];
  filter: string;
  onFilter: (value: string) => void;
}

/** Read-only viewer of the immutable audit log (admin). */
export function AuditViewer({ entries, filter, onFilter }: Props) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-brand">Auditoría</h2>
      <p className="mt-1 text-sm text-slate-600">Registro inmutable de acciones (más recientes primero).</p>

      <input
        className="mt-3 w-full max-w-xs rounded-md border px-3 py-2 text-sm"
        placeholder="Filtrar por acción (p. ej. crisis_line_updated)"
        value={filter}
        onChange={(e) => onFilter(e.target.value)}
      />

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-4">Fecha</th>
              <th className="py-2 pr-4">Acción</th>
              <th className="py-2 pr-4">Rol</th>
              <th className="py-2 pr-4">Usuario</th>
              <th className="py-2 pr-4">Registro</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="py-2 pr-4 whitespace-nowrap">{new Date(e.creado_en).toLocaleString()}</td>
                <td className="py-2 pr-4 font-medium">{e.accion}</td>
                <td className="py-2 pr-4">{e.rol ?? '—'}</td>
                <td className="py-2 pr-4 font-mono text-xs">{e.usuario_id ?? '—'}</td>
                <td className="py-2 pr-4 font-mono text-xs">{e.registro_afectado ?? '—'}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-slate-500">
                  Sin entradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
