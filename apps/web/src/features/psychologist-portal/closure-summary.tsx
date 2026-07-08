import type { CaseClosureView } from '../../lib/types';
import {
  CLOSE_REASONS,
  CONTACT_MEDIUMS,
  NO_CONTACT_REASONS,
  REFERRAL_DESTINATIONS,
  REFERRAL_TYPES,
  SEXES,
  SYMPTOMS,
  TECHNIQUES,
  labelOf,
} from './closure-catalog';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/** Read-only summary of a recorded clinical closure. */
export function ClosureSummary({ cierre }: { cierre: CaseClosureView }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">Expediente de cierre</h2>
      <div className="mt-2 divide-y divide-slate-100">
        <Row label="¿Contactó?" value={cierre.contacto ? 'Sí' : 'No'} />
        {!cierre.contacto && (
          <Row label="Motivo" value={labelOf(NO_CONTACT_REASONS, cierre.motivo_no_contacto)} />
        )}
        {cierre.contacto && (
          <>
            <Row label="Sexo" value={labelOf(SEXES, cierre.sexo)} />
            <Row label="Destinatario" value={cierre.destinatario ?? '—'} />
            <Row
              label="Síntomas"
              value={cierre.sintomas.map((s) => labelOf(SYMPTOMS, s)).join(', ') || '—'}
            />
            <Row label="Medio" value={labelOf(CONTACT_MEDIUMS, cierre.medio_contacto)} />
            <Row
              label="Técnicas"
              value={cierre.tecnicas.map((t) => labelOf(TECHNIQUES, t)).join(', ') || '—'}
            />
            <Row label="Motivo de cierre" value={labelOf(CLOSE_REASONS, cierre.motivo_cierre)} />
            <Row label="Derivación" value={labelOf(REFERRAL_TYPES, cierre.derivacion_tipo)} />
            {cierre.derivacion_destino && (
              <Row label="Destino" value={labelOf(REFERRAL_DESTINATIONS, cierre.derivacion_destino)} />
            )}
            {cierre.comentario && <Row label="Comentario" value={cierre.comentario} />}
          </>
        )}
        <Row label="Horas" value={String(cierre.horas)} />
      </div>
    </section>
  );
}
