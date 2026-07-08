import type { CaseContactView, CaseSummary } from '../../lib/types';
import { HABIT_CHANGES } from '../intake/green-form';

const RISK_LABEL: Record<string, string> = {
  riesgo_alto: 'Riesgo alto',
  riesgo_moderado: 'Riesgo moderado',
  seguimiento: 'Seguimiento',
};

const HABIT_LABEL: Record<string, string> = Object.fromEntries(
  HABIT_CHANGES.map((h) => [h.code, h.label]),
);

const REQUESTER_LABEL: Record<string, string> = {
  victima: 'Víctima directa',
  familiar: 'Familiar',
  voluntario: 'Voluntario / rescatista',
};

const CONTACT_METHOD_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  llamada: 'Llamada',
};

function waLink(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}`;
}

/** Identity + key data of the case for the assigned psychologist (PII allowed). */
export function CaseIdentityCard({
  caso,
  contacto,
}: {
  caso: CaseSummary;
  contacto: CaseContactView | null;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand">{contacto?.nombre ?? 'Solicitante'}</h1>
          <p className="text-sm text-slate-600">
            {caso.tipo_solicitante ? (REQUESTER_LABEL[caso.tipo_solicitante] ?? caso.tipo_solicitante) : 'Tipo no indicado'}
            {caso.edad != null && ` · ${caso.edad} años`}
            {caso.zona && ` · ${caso.zona}`}
          </p>
        </div>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-sm">{caso.estado}</span>
      </div>

      {contacto?.contacto && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <a href={`tel:${contacto.contacto.replace(/\s+/g, '')}`} className="rounded-md border px-3 py-1 font-medium text-brand">
            Llamar {contacto.contacto}
          </a>
          <a href={waLink(contacto.contacto)} target="_blank" rel="noreferrer" className="rounded-md border px-3 py-1 font-medium text-brand">
            WhatsApp
          </a>
          {caso.metodo_contacto && CONTACT_METHOD_LABEL[caso.metodo_contacto] && (
            <span className="rounded-md bg-brand/10 px-3 py-1 font-medium text-brand">
              Prefiere: {CONTACT_METHOD_LABEL[caso.metodo_contacto]}
            </span>
          )}
        </div>
      )}

      <p className="mt-3 text-sm text-slate-600">
        {RISK_LABEL[caso.nivel_riesgo] ?? caso.nivel_riesgo} · índice de urgencia {caso.score_urgencia}
      </p>

      {caso.cambio_habitos && caso.cambio_habitos.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cambios de hábitos reportados
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {caso.cambio_habitos.map((code) => (
              <span key={code} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                {HABIT_LABEL[code] ?? code}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
