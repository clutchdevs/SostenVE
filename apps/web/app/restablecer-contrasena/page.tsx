'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../src/lib/api-client';

/**
 * Public password reset redemption (RF-2.2.4, issue #36). Opened from the reset
 * email, which carries the single-use token as `?token=…`. Setting a new password
 * consumes the token and invalidates prior sessions; on success we send the user
 * to the login screen. The token is read client-side to avoid a Suspense boundary.
 */
export default function ResetPasswordPage() {
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
    if (
      password.length < 12 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
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
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        auth: false,
        body: { token, contrasena: password },
      });
      setDone(true);
      setTimeout(() => router.replace('/login'), 1500);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? 'El enlace es inválido o ha expirado. Solicita uno nuevo.'
          : 'No se pudo restablecer la contraseña. Intenta de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-xl font-bold text-brand">Contraseña restablecida</h1>
        <p className="mt-2 text-sm text-slate-600">Redirigiendo al inicio de sesión…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <Link href="/login" className="text-sm text-brand underline">
        ← Volver al inicio de sesión
      </Link>
      <h1 className="mt-4 text-xl font-bold text-brand">Nueva contraseña</h1>
      <p className="mt-1 text-sm text-slate-600">Define una nueva contraseña para tu cuenta.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className="w-full rounded-md border px-3 py-2"
          placeholder="Token de recuperación"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="password"
          placeholder="Nueva contraseña (mín. 12, con mayúsculas, números y símbolo)"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="password"
          placeholder="Confirmar contraseña"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p className="text-sm text-risk-high">{error}</p>}
        <button
          type="submit"
          disabled={busy || !token}
          className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Restablecer contraseña
        </button>
      </form>
    </main>
  );
}
