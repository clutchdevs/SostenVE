import type { CaseContactView, CaseSummary } from '../../lib/types';
import { formatPhoneDisplay, toInternationalVePhone } from '../../lib/validation';
import { HABIT_CHANGES } from '../intake/green-form';
import { TAG_CATALOG } from '../intake/tag-catalog';
import { urgencyLabel } from '../intake/urgency';

const RISK_LABEL: Record<string, string> = {
  riesgo_alto: 'Riesgo alto',
  riesgo_moderado: 'Riesgo moderado',
  seguimiento: 'Seguimiento',
};

const HABIT_LABEL: Record<string, string> = Object.fromEntries(
  HABIT_CHANGES.map((h) => [h.code, h.label]),
);

const TAG_LABEL: Record<string, string> = Object.fromEntries(
  TAG_CATALOG.map((t) => [t.code, t.label]),
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
  return `https://wa.me/${toInternationalVePhone(phone)}`;
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

      {/* Contact is revealed only after accepting (#131): before then the backend
          withholds it and we explain why, so nobody contacts before accepting. */}
      {contacto?.contacto ? (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <a href={`tel:+${toInternationalVePhone(contacto.contacto)}`} className="rounded-md border px-3 py-1 font-medium text-brand">
            Llamar {formatPhoneDisplay(contacto.contacto)}
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
      ) : caso.estado === 'asignado' ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          El contacto del solicitante se mostrará cuando aceptes el caso.
        </p>
      ) : null}

      <p className="mt-3 text-sm text-slate-600">
        {RISK_LABEL[caso.nivel_riesgo] ?? caso.nivel_riesgo} · índice de urgencia {caso.score_urgencia}
      </p>

      {caso.urgencia_respuesta != null && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            ¿Cómo se siente? (respuesta del solicitante)
          </p>
          <p className="mt-1 text-sm text-slate-700">{urgencyLabel(caso.urgencia_respuesta)}</p>
        </div>
      )}

      {caso.sintomas && caso.sintomas.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Síntomas reportados
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {caso.sintomas.map((code) => (
              <span key={code} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                {TAG_LABEL[code] ?? code}
              </span>
            ))}
          </div>
        </div>
      )}

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
