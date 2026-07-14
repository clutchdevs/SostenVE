'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SubmitButton } from '../../src/components/submit-button';
import { apiFetch, ApiError } from '../../src/lib/api-client';
import { clearSession } from '../../src/lib/session';
import { ui } from '../../src/lib/ui';
import {
  CEDULA_ERROR,
  INTL_PHONE_ERROR,
  isValidDocumentNumber,
  isValidIntlPhone,
  PHONE_MAX_LENGTH,
} from '../../src/lib/validation';
import { COLEGIO_OTRO, VE_ESTADOS } from '../../src/lib/venezuela';

interface ConsentText {
  version: string;
  updated_at: string;
  text: string;
}

interface RegisterResult {
  voluntario_id: string;
  estado_validacion: string;
}

const DIAS = [
  ['lunes', 'Lun'],
  ['martes', 'Mar'],
  ['miercoles', 'Mié'],
  ['jueves', 'Jue'],
  ['viernes', 'Vie'],
  ['sabado', 'Sáb'],
  ['domingo', 'Dom'],
] as const;
const BLOQUES = [
  ['manana', 'Mañana'],
  ['tarde', 'Tarde'],
  ['noche', 'Noche'],
] as const;
const MODALIDADES = [
  ['presencial', 'Presencial'],
  ['distancia', 'A distancia'],
] as const;

const inputClass = ui.field;

/**
 * Complete psychologist application form (RF-2.1.2, Módulo 2) with mandatory
 * informed consent (RF-2.1.1). Collects the full PRD applicant data — document,
 * FPV number, university, graduation year, PAP training, colegio, attention
 * modalities and a structured weekly availability — and blocks submission until
 * the consent checkbox is accepted.
 */
export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('V');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [numeroFpv, setNumeroFpv] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [universidad, setUniversidad] = useState('');
  const [anioEgreso, setAnioEgreso] = useState('');
  const [colegio, setColegio] = useState('');
  const [colegioOtro, setColegioOtro] = useState('');
  const [paisResidencia, setPaisResidencia] = useState('');
  const [ciudadResidencia, setCiudadResidencia] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [modalidad, setModalidad] = useState<string[]>([]);
  const [slots, setSlots] = useState<Set<string>>(new Set());
  const [pap, setPap] = useState(false);
  const [papDetalle, setPapDetalle] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);

  const [consent, setConsent] = useState<ConsentText | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load the current consent text/version so the user accepts exactly what the
  // backend will validate against.
  useEffect(() => {
    apiFetch<ConsentText>('/consent/active', { auth: false })
      .then(setConsent)
      .catch(() => setError('No se pudo cargar el consentimiento informado. Recarga la página.'));
  }, []);

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function toggleSlot(dia: string, bloque: string) {
    const key = `${dia}|${bloque}`;
    setSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function submit() {
    if (!consent) return;
    setError('');
    // "Otro" colegio resolves to the free-text value; a listed state uses its name.
    const colegioValue = colegio === COLEGIO_OTRO ? colegioOtro.trim() : colegio.trim();
    // Required-field guard (enforced regardless of native `required`).
    if (
      !nombre.trim() ||
      !numeroFpv.trim() ||
      !email.trim() ||
      !universidad.trim() ||
      !anioEgreso.trim() ||
      !colegioValue ||
      !paisResidencia.trim() ||
      !ciudadResidencia.trim()
    ) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    // Format checks mirror the server (schemas.ts); the input filters below keep
    // letters out of the number fields, this catches wrong length/format.
    if (!isValidDocumentNumber(numeroDocumento, tipoDocumento)) {
      setError(CEDULA_ERROR);
      return;
    }
    if (!isValidIntlPhone(telefono)) {
      setError(INTL_PHONE_ERROR);
      return;
    }
    setSubmitting(true);
    try {
      const disponibilidad_horaria = [...slots].map((key) => {
        const [dia, bloque] = key.split('|');
        return { dia, bloque };
      });
      const res = await apiFetch<RegisterResult>('/volunteers/register', {
        method: 'POST',
        auth: false,
        body: {
          nombre,
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento,
          numero_fpv: numeroFpv,
          email,
          telefono,
          universidad,
          anio_egreso: Number(anioEgreso),
          colegio: colegioValue,
          pais_residencia: paisResidencia,
          ciudad_residencia: ciudadResidencia,
          especialidad: especialidad || undefined,
          modalidad,
          disponibilidad_horaria,
          pap,
          pap_detalle: pap ? papDetalle : undefined,
          consentimiento: true,
          consentimiento_version: consent.version,
        },
      });
      setResult(res);
    } catch (err) {
      // Show the API's message for actionable rejections (e.g. not in the FPV
      // registry → 422, or a stale consent version → 409); generic otherwise.
      setError(
        err instanceof ApiError && (err.status === 422 || err.status === 409)
          ? err.message
          : 'No se pudo completar el registro. Revisa los datos e inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const pendiente = result.estado_validacion !== 'validado';
    return (
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-xl font-serif font-semibold text-ink">Registro recibido</h1>
        <p className="mt-3 text-sm text-slate-600">
          {pendiente
            ? 'Tu cuenta quedó pendiente de validación por la FPV. Cuando sea aprobada, te enviaremos por correo tu usuario y una contraseña temporal de acceso.'
            : 'Tu cuenta fue validada. Te enviamos a tu correo tu usuario y una contraseña temporal para iniciar sesión (revisa también la carpeta de spam).'}
        </p>
        <button
          type="button"
          onClick={() => {
            // A brand-new applicant should log in as themselves; drop any stale
            // session so /login shows the form instead of bouncing to a portal.
            clearSession();
            router.push('/login');
          }}
          className={`mt-6 block w-full text-center ${ui.primaryBtn}`}
        >
          Ir a iniciar sesión
        </button>
      </main>
    );
  }

  const availabilityChosen = slots.size > 0;
  // Form completeness only; the submitting state disables the button separately.
  const canSubmit = !!consent && consentChecked && modalidad.length > 0 && availabilityChosen;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Link href="/" className={ui.link}>
        ← Volver al inicio
      </Link>
      <h1 className="mt-4 text-xl font-serif font-semibold text-ink">Registro de psicólogos</h1>
      <p className={`mt-1 ${ui.muted}`}>Voluntarios de la Federación de Psicólogos de Venezuela.</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className={inputClass}
          type="text"
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <div className="flex gap-2">
          <select
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-ink"
            aria-label="Tipo de documento"
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value)}
          >
            <option value="V">V</option>
            <option value="E">E</option>
            <option value="P">P</option>
          </select>
          <input
            className={inputClass}
            type="text"
            inputMode={tipoDocumento === 'P' ? 'text' : 'numeric'}
            maxLength={tipoDocumento === 'P' ? 20 : 8}
            placeholder={tipoDocumento === 'P' ? 'Número de pasaporte' : 'Cédula (hasta 8 dígitos)'}
            value={numeroDocumento}
            onChange={(e) =>
              setNumeroDocumento(
                // V/E cédulas are numeric (≤8): strip anything else as you type.
                tipoDocumento === 'P'
                  ? e.target.value
                  : e.target.value.replace(/\D/g, '').slice(0, 8),
              )
            }
            required
          />
        </div>

        <input
          className={inputClass}
          type="text"
          placeholder="Número de inscripción FPV"
          value={numeroFpv}
          onChange={(e) => setNumeroFpv(e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="tel"
          inputMode="tel"
          maxLength={PHONE_MAX_LENGTH}
          placeholder="Teléfono (ej. +58 414 1234567)"
          value={telefono}
          // Allow only phone characters so letters can't be entered.
          onChange={(e) => setTelefono(e.target.value.replace(/[^\d+\s().-]/g, ''))}
          required
        />
        <p className="text-xs text-slate-500">
          No elijas contraseña: si tu registro es validado, te enviaremos una contraseña temporal por
          correo.
        </p>
        <input
          className={inputClass}
          type="text"
          placeholder="Universidad de egreso"
          value={universidad}
          onChange={(e) => setUniversidad(e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="number"
          placeholder="Año de egreso"
          min={1950}
          max={new Date().getFullYear()}
          value={anioEgreso}
          onChange={(e) => setAnioEgreso(e.target.value)}
          required
        />
        <select
          className={inputClass}
          value={colegio}
          onChange={(e) => setColegio(e.target.value)}
          aria-label="Colegio de psicólogos"
          required
        >
          <option value="" disabled>
            Colegio de psicólogos (estado)
          </option>
          {VE_ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
          <option value={COLEGIO_OTRO}>Otro…</option>
        </select>
        {colegio === COLEGIO_OTRO && (
          <input
            className={inputClass}
            type="text"
            placeholder="Especifica el colegio"
            value={colegioOtro}
            onChange={(e) => setColegioOtro(e.target.value)}
            required
          />
        )}
        <input
          className={inputClass}
          type="text"
          placeholder="País de residencia"
          value={paisResidencia}
          onChange={(e) => setPaisResidencia(e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="text"
          placeholder="Ciudad de residencia"
          value={ciudadResidencia}
          onChange={(e) => setCiudadResidencia(e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="text"
          placeholder="Especialidad (opcional)"
          value={especialidad}
          onChange={(e) => setEspecialidad(e.target.value)}
        />

        <fieldset className="rounded-xl border border-slate-300 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">Modalidad de atención</legend>
          <div className="flex gap-4">
            {MODALIDADES.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={modalidad.includes(value)}
                  onChange={() => setModalidad((m) => toggle(m, value))}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-300 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">Disponibilidad horaria</legend>
          <table className="w-full text-center text-xs text-slate-700">
            <thead>
              <tr>
                <th className="py-1" />
                {DIAS.map(([value, label]) => (
                  <th key={value} className="py-1 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BLOQUES.map(([bloque, bloqueLabel]) => (
                <tr key={bloque}>
                  <td className="py-1 text-left font-medium">{bloqueLabel}</td>
                  {DIAS.map(([dia, diaLabel]) => (
                    <td key={dia} className="py-1">
                      <input
                        type="checkbox"
                        aria-label={`${diaLabel} ${bloqueLabel}`}
                        checked={slots.has(`${dia}|${bloque}`)}
                        onChange={() => toggleSlot(dia, bloque)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-300 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">
            Formación en Primeros Auxilios Psicológicos (PAP)
          </legend>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={pap} onChange={(e) => setPap(e.target.checked)} />
            <span>Tengo formación en PAP</span>
          </label>
          {pap && (
            <textarea
              className={`mt-2 text-sm ${ui.field}`}
              placeholder="Detalle de la formación en PAP"
              value={papDetalle}
              onChange={(e) => setPapDetalle(e.target.value)}
              required
            />
          )}
        </fieldset>

        <fieldset className="rounded-xl border border-slate-300 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">Consentimiento informado</legend>
          <div className="max-h-40 overflow-y-auto whitespace-pre-line rounded bg-slate-50 p-2 text-xs text-slate-600">
            {consent ? consent.text : 'Cargando…'}
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
            />
            <span>He leído y acepto el consentimiento informado.</span>
          </label>
        </fieldset>

        {error && <p className={ui.error}>{error}</p>}

        <SubmitButton
          pending={submitting}
          disabled={!canSubmit}
          pendingText="Enviando…"
          className="w-full disabled:cursor-not-allowed"
        >
          Registrarme
        </SubmitButton>
      </form>

      <p className={`mt-4 text-center ${ui.muted}`}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className={`font-semibold ${ui.link}`}>
          Iniciar sesión
        </Link>
      </p>
    </main>
  );
}
