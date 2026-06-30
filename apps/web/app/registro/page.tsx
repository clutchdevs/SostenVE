'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../src/lib/api-client';

interface ConsentText {
  version: string;
  updated_at: string;
  text: string;
}

interface RegisterResult {
  voluntario_id: string;
  estado_validacion: string;
}

/**
 * Psychologist registration with mandatory informed consent (RF-2.1.1, Módulo 2).
 * The consent text + version come from the API (config-driven); the submit button
 * stays disabled until the consent checkbox is ticked, and the accepted version is
 * sent so the backend can record an auditable acceptance.
 */
export default function RegistroPage() {
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [especialidad, setEspecialidad] = useState('');
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

  async function submit() {
    if (!consent) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch<RegisterResult>('/volunteers/register', {
        method: 'POST',
        auth: false,
        body: {
          nombre,
          cedula_profesional: cedula,
          email,
          contrasena: password,
          especialidad: especialidad || undefined,
          consentimiento: true,
          consentimiento_version: consent.version,
        },
      });
      setResult(res);
    } catch {
      setError('No se pudo completar el registro. Revisa los datos e inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const pendiente = result.estado_validacion !== 'validado';
    return (
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-xl font-bold text-brand">Registro recibido</h1>
        <p className="mt-3 text-sm text-slate-600">
          {pendiente
            ? 'Tu cuenta quedó pendiente de validación por la FPV. Te avisaremos por correo cuando esté aprobada.'
            : 'Tu cuenta fue validada. Ya puedes iniciar sesión.'}
        </p>
        <Link
          href="/login"
          className="mt-6 block rounded-md bg-brand px-4 py-2 text-center font-medium text-white"
        >
          Ir a iniciar sesión
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <Link href="/" className="text-sm text-brand underline">
        ← Volver al inicio
      </Link>
      <h1 className="mt-4 text-xl font-bold text-brand">Registro de psicólogos</h1>
      <p className="mt-1 text-sm text-slate-600">Voluntarios de la Federación de Psicólogos de Venezuela.</p>

      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className="w-full rounded-md border px-3 py-2"
          type="text"
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="text"
          placeholder="Cédula profesional (FPV)"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
          required
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="password"
          placeholder="Contraseña (mínimo 8 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="text"
          placeholder="Especialidad (opcional)"
          value={especialidad}
          onChange={(e) => setEspecialidad(e.target.value)}
        />

        <fieldset className="rounded-md border border-slate-300 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">
            Consentimiento informado
            {consent && <span className="ml-1 text-xs text-slate-400">({consent.version})</span>}
          </legend>
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

        {error && <p className="text-sm text-risk-high">{error}</p>}

        <button
          type="submit"
          disabled={!consent || !consentChecked || submitting}
          className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Enviando…' : 'Registrarme'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-semibold text-brand underline">
          Iniciar sesión
        </Link>
      </p>
    </main>
  );
}
