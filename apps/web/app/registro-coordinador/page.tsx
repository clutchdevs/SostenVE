'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthShell } from '../../src/components/auth-shell';
import { apiFetch, ApiError } from '../../src/lib/api-client';
import { ui } from '../../src/lib/ui';
import {
  CEDULA_ERROR,
  isValidDocumentNumber,
  isValidVePhone,
  PHONE_ERROR,
  PHONE_MAX_LENGTH,
} from '../../src/lib/validation';

/**
 * Coordinator self-activation page (RF-2.6). Opened from the invitation email
 * link, which carries the single-use token as `?token=…`. The coordinator fills
 * the structured sign-up fields (RF-2.6.2) and sets a robust password (≥12,
 * mixed) to activate; on success they are sent to the login screen. The token is
 * read from the URL on the client to avoid a Suspense boundary.
 */
function isStrongPassword(p: string): boolean {
  return (
    p.length >= 12 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)
  );
}

export default function CoordinatorOnboardingPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'V' | 'E' | 'P'>('V');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [numeroFpv, setNumeroFpv] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('token');
    if (fromUrl) setToken(fromUrl);
  }, []);

  async function submit() {
    setError('');
    if (!nombres.trim() || !apellidos.trim() || !numeroDocumento.trim() || !telefono.trim()) {
      setError('Completa nombres, apellidos, cédula y teléfono.');
      return;
    }
    if (!isValidDocumentNumber(numeroDocumento, tipoDocumento)) {
      setError(CEDULA_ERROR);
      return;
    }
    if (!isValidVePhone(telefono)) {
      setError(PHONE_ERROR);
      return;
    }
    if (!isStrongPassword(password)) {
      setError(
        'La contraseña debe tener al menos 12 caracteres e incluir mayúsculas, minúsculas, números y un carácter especial.',
      );
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/coordinators/accept-invitation', {
        method: 'POST',
        auth: false,
        body: {
          token,
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento.trim(),
          numero_fpv: numeroFpv.trim() || undefined,
          telefono: telefono.trim(),
          contrasena: password,
        },
      });
      setDone(true);
      setTimeout(() => router.replace('/login-coordinador'), 1500);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? 'La invitación es inválida o ha expirado, o los datos no cumplen los requisitos. Revisa e intenta de nuevo.'
          : 'No se pudo completar el registro. Intenta de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="¡Cuenta activada!">
        <p className={ui.muted}>Redirigiendo al inicio de sesión…</p>
      </AuthShell>
    );
  }

  const inputClass = ui.field;

  return (
    <AuthShell
      title="Registro de coordinador"
      subtitle="Completa tus datos y define una contraseña para activar tu cuenta de coordinador de la FPV."
      backHref="/"
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className={inputClass}
          placeholder="Token de invitación"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Nombres"
          value={nombres}
          onChange={(e) => setNombres(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Apellidos"
          value={apellidos}
          onChange={(e) => setApellidos(e.target.value)}
        />
        <div className="flex gap-2">
          <select
            className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-ink"
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value as 'V' | 'E' | 'P')}
            aria-label="Tipo de documento"
          >
            <option value="V">V</option>
            <option value="E">E</option>
            <option value="P">P</option>
          </select>
          <input
            className={inputClass}
            inputMode={tipoDocumento === 'P' ? 'text' : 'numeric'}
            maxLength={tipoDocumento === 'P' ? 20 : 8}
            placeholder={tipoDocumento === 'P' ? 'Número de pasaporte' : 'Cédula (hasta 8 dígitos)'}
            value={numeroDocumento}
            onChange={(e) =>
              setNumeroDocumento(
                tipoDocumento === 'P'
                  ? e.target.value
                  : e.target.value.replace(/\D/g, '').slice(0, 8),
              )
            }
          />
        </div>
        <input
          className={inputClass}
          placeholder="Número FPV (opcional)"
          value={numeroFpv}
          onChange={(e) => setNumeroFpv(e.target.value)}
        />
        <input
          className={inputClass}
          type="tel"
          inputMode="tel"
          maxLength={PHONE_MAX_LENGTH}
          placeholder="Teléfono (ej. 0414-1234567)"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value.replace(/[^\d+\s().-]/g, ''))}
        />
        <input
          className={inputClass}
          type="password"
          placeholder="Contraseña (mín. 12, con mayúsculas, números y símbolo)"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className={inputClass}
          type="password"
          placeholder="Confirmar contraseña"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p className={ui.error}>{error}</p>}
        <button type="submit" disabled={busy || !token} className={`w-full ${ui.primaryBtn}`}>
          Activar cuenta
        </button>
      </form>
    </AuthShell>
  );
}
