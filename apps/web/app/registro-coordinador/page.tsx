'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../src/lib/api-client';

/**
 * Coordinator self-activation page (RF-2.6). Opened from the invitation email
 * link, which carries the single-use token as `?token=…`. The coordinator sets a
 * password to activate; on success they are sent to the login screen. The token
 * is read from the URL on the client to avoid a Suspense boundary.
 */
export default function CoordinatorOnboardingPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
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
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
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
        body: { token, contrasena: password },
      });
      setDone(true);
      setTimeout(() => router.replace('/login-coordinador'), 1500);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? 'La invitación es inválida o ha expirado. Pide una nueva al administrador.'
          : 'No se pudo completar el registro. Intenta de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-xl font-bold text-brand">¡Cuenta activada!</h1>
        <p className="mt-2 text-sm text-slate-600">Redirigiendo al inicio de sesión…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <Link href="/" className="text-sm text-brand underline">
        ← Volver al inicio
      </Link>
      <h1 className="mt-4 text-xl font-bold text-brand">Registro de coordinador</h1>
      <p className="mt-1 text-sm text-slate-600">
        Define tu contraseña para activar tu cuenta de coordinador de la FPV.
      </p>
      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className="w-full rounded-md border px-3 py-2"
          placeholder="Token de invitación"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="password"
          placeholder="Contraseña (mínimo 8 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="password"
          placeholder="Confirmar contraseña"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p className="text-sm text-risk-high">{error}</p>}
        <button
          type="submit"
          disabled={busy || !token}
          className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Activar cuenta
        </button>
      </form>
    </main>
  );
}
