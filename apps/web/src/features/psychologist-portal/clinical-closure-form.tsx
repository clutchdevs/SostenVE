'use client';

import { useState } from 'react';
import {
  CLOSE_REASONS,
  CONTACT_MEDIUMS,
  NO_CONTACT_REASONS,
  REFERRAL_DESTINATIONS,
  REFERRAL_TYPES,
  SEXES,
  SYMPTOMS,
  TECHNIQUES,
} from './closure-catalog';

export interface ClosureSubmission {
  contacto: boolean;
  motivo_no_contacto?: string;
  sexo?: string;
  sintomas: string[];
  otro_sintoma?: string;
  medio_contacto?: string;
  tecnicas: string[];
  motivo_cierre?: string;
  derivacion_tipo?: string;
  derivacion_destino?: string;
  horas: number;
  comentario?: string;
}

function toggle(list: string[], code: string): string[] {
  return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
}

/**
 * Structured clinical closure (Module 4, RF-4.2). Contactability gates the form:
 * "No" → quick administrative close; "Sí" → full clinical record. Closing a case
 * is terminal.
 */
export function ClinicalClosureForm({
  onSubmit,
}: {
  onSubmit: (closure: ClosureSubmission) => void | Promise<void>;
}) {
  const [contacted, setContacted] = useState<boolean | null>(null);
  const [noContactReason, setNoContactReason] = useState('');
  const [sex, setSex] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [contactMedium, setContactMedium] = useState('');
  const [techniques, setTechniques] = useState<string[]>([]);
  const [closeReason, setCloseReason] = useState('');
  const [referralType, setReferralType] = useState('ninguna');
  const [referralDestination, setReferralDestination] = useState('');
  const [hours, setHours] = useState(contacted === false ? 0.05 : 0.25);
  const [comment, setComment] = useState('');

  const needsDestination = referralType !== 'ninguna' && referralType !== '';
  const canSubmit =
    contacted !== null &&
    hours > 0 &&
    (contacted ? closeReason !== '' : noContactReason !== '');

  function submit() {
    if (!canSubmit || contacted === null) return;
    void onSubmit(
      contacted
        ? {
            contacto: true,
            sexo: sex || undefined,
            sintomas: symptoms,
            medio_contacto: contactMedium || undefined,
            tecnicas: techniques,
            motivo_cierre: closeReason || undefined,
            derivacion_tipo: referralType || undefined,
            derivacion_destino: needsDestination ? referralDestination || undefined : undefined,
            horas: hours,
            comentario: comment || undefined,
          }
        : {
            contacto: false,
            motivo_no_contacto: noContactReason || undefined,
            sintomas: [],
            tecnicas: [],
            horas: hours,
          },
    );
  }

  return (
    <form
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h3 className="font-semibold">Cierre del caso</h3>

      <fieldset>
        <legend className="text-sm font-medium">¿Conseguiste contactar al solicitante?</legend>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            aria-pressed={contacted === true}
            onClick={() => {
              setContacted(true);
              setHours(0.25);
            }}
            className={`flex-1 rounded-md border px-3 py-2 ${contacted === true ? 'bg-brand text-white' : 'bg-white'}`}
          >
            Sí
          </button>
          <button
            type="button"
            aria-pressed={contacted === false}
            onClick={() => {
              setContacted(false);
              setHours(0.05);
            }}
            className={`flex-1 rounded-md border px-3 py-2 ${contacted === false ? 'bg-brand text-white' : 'bg-white'}`}
          >
            No
          </button>
        </div>
      </fieldset>

      {contacted === false && (
        <label className="block text-sm">
          Motivo del cierre
          <select
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={noContactReason}
            onChange={(e) => setNoContactReason(e.target.value)}
          >
            <option value="">Selecciona…</option>
            {NO_CONTACT_REASONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {contacted === true && (
        <>
          <Chips label="Sexo" options={SEXES} selected={sex ? [sex] : []} onToggle={(c) => setSex(sex === c ? '' : c)} />
          <Chips label="Sintomatología" options={SYMPTOMS} selected={symptoms} onToggle={(c) => setSymptoms((s) => toggle(s, c))} />
          <label className="block text-sm">
            Medio de contacto
            <select className="mt-1 w-full rounded-md border px-3 py-2" value={contactMedium} onChange={(e) => setContactMedium(e.target.value)}>
              <option value="">Selecciona…</option>
              {CONTACT_MEDIUMS.map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </label>
          <Chips label="Técnicas utilizadas" options={TECHNIQUES} selected={techniques} onToggle={(c) => setTechniques((t) => toggle(t, c))} />
          <label className="block text-sm">
            Motivo del cierre
            <select className="mt-1 w-full rounded-md border px-3 py-2" value={closeReason} onChange={(e) => setCloseReason(e.target.value)}>
              <option value="">Selecciona…</option>
              {CLOSE_REASONS.map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            ¿Debe continuar con apoyo? (derivación)
            <select className="mt-1 w-full rounded-md border px-3 py-2" value={referralType} onChange={(e) => setReferralType(e.target.value)}>
              {REFERRAL_TYPES.map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </label>
          {needsDestination && (
            <label className="block text-sm">
              Destino de la derivación
              <select className="mt-1 w-full rounded-md border px-3 py-2" value={referralDestination} onChange={(e) => setReferralDestination(e.target.value)}>
                <option value="">Selecciona…</option>
                {REFERRAL_DESTINATIONS.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            Comentario de evolución (máx. 1500)
            <textarea
              className="mt-1 w-full rounded-md border px-3 py-2"
              maxLength={1500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>
        </>
      )}

      {contacted !== null && (
        <label className="block text-sm">
          Horas totales de atención
          <input
            type="number"
            step="0.25"
            min="0"
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
        </label>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Guardar y cerrar caso
      </button>
    </form>
  );
}

function Chips({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { code: string; label: string }[];
  selected: string[];
  onToggle: (code: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.code}
            type="button"
            aria-pressed={selected.includes(o.code)}
            onClick={() => onToggle(o.code)}
            className={`rounded-full border px-3 py-1 text-sm ${selected.includes(o.code) ? 'bg-brand text-white' : 'bg-white'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
