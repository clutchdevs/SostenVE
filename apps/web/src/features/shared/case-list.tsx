import type { CaseSummary } from '../../lib/types';

const RISK_LABEL: Record<string, string> = {
  riesgo_alto: 'Riesgo alto',
  riesgo_moderado: 'Riesgo moderado',
  seguimiento: 'Seguimiento',
};

const RISK_STYLE: Record<string, string> = {
  riesgo_alto: 'bg-risk-high text-white',
  riesgo_moderado: 'bg-risk-moderate text-white',
  seguimiento: 'bg-risk-followup text-white',
};

export function isUnattendedHighRisk(c: CaseSummary): boolean {
  return c.nivel_riesgo === 'riesgo_alto' && (c.estado === 'pendiente' || c.estado === 'asignado');
}

function isSlaOverdue(c: CaseSummary, now: Date): boolean {
  return c.sla_vence_en !== null && new Date(c.sla_vence_en).getTime() < now.getTime();
}

/**
 * Case list shared by the psychologist portal and coordinator panel. High-risk
 * unattended cases are visually prioritized (the coordinator must spot them).
 */
export function CaseList({
  cases,
  onOpen,
  now = new Date(),
}: {
  cases: CaseSummary[];
  onOpen?: (caseId: string) => void;
  now?: Date;
}) {
  if (cases.length === 0) {
    return <p className="text-slate-500">No hay casos.</p>;
  }
  return (
    <ul className="space-y-2">
      {cases.map((c) => {
        const urgent = isUnattendedHighRisk(c);
        return (
          <li
            key={c.caso_id}
            className={`rounded-lg border p-3 ${urgent ? 'border-risk-high bg-red-50' : 'border-slate-200 bg-white'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RISK_STYLE[c.nivel_riesgo] ?? 'bg-slate-400 text-white'}`}>
                {RISK_LABEL[c.nivel_riesgo] ?? c.nivel_riesgo}
              </span>
              <span className="text-sm text-slate-500">{c.estado}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-slate-600">
                {c.zona ?? 'Sin zona'} · {new Date(c.creado_en).toLocaleDateString('es-VE')}
              </span>
              {onOpen && (
                <button
                  type="button"
                  onClick={() => onOpen(c.caso_id)}
                  className="text-sm font-medium text-brand underline"
                >
                  Abrir
                </button>
              )}
            </div>
            {urgent && (
              <p className="mt-2 text-sm font-semibold text-risk-high">⚠ Riesgo alto sin atender</p>
            )}
            {isSlaOverdue(c, now) && c.nivel_riesgo === 'riesgo_alto' && (
              <p className="text-sm font-semibold text-risk-high">⏰ SLA vencido</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
