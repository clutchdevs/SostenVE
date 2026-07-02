'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../src/lib/api-client';
import { clearSession, homePathForRole, getRole, isSessionActive } from '../../src/lib/session';

/**
 * Authenticated self-service password change (RF-2.2.4, issue #36). Changing the
 * password bumps the server token version, so the current session is invalidated;
 * on success we clear it locally and send the user back to the login screen.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isSessionActive()) {
      router.replace('/login');
    } else {
      setChecking(false);
    }
  }, [router]);

  async function submit() {
    setError('');
    if (
      next.length < 12 ||
      !/[a-z]/.test(next) ||
      !/[A-Z]/.test(next) ||
      !/[0-9]/.test(next) ||
      !/[^A-Za-z0-9]/.test(next)
    ) {
      setError(
        'La contraseña debe tener al menos 12 caracteres e incluir mayúsculas, minúsculas, números y un carácter especial.',
      );
      return;
    }
    if (next !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (next === current) {
      setError('La nueva contraseña debe ser distinta de la actual.');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: { contrasena_actual: current, contrasena_nueva: next },
      });
      setDone(true);
      // The session token is now stale (token_version bumped): force re-login.
      clearSession();
      setTimeout(() => router.replace('/login'), 1800);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('La contraseña actual es incorrecta.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError('La nueva contraseña debe ser distinta de la actual.');
      } else {
        setError('No se pudo cambiar la contraseña. Intenta de nuevo.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (checking) return null;

  if (done) {
    return (
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-xl font-bold text-brand">Contraseña actualizada</h1>
        <p className="mt-2 text-sm text-slate-600">
          Por seguridad, cerramos tu sesión. Redirigiendo al inicio de sesión…
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <Link href={homePathForRole(getRole())} className="text-sm text-brand underline">
        ← Volver
      </Link>
      <h1 className="mt-4 text-xl font-bold text-brand">Cambiar contraseña</h1>
      <p className="mt-1 text-sm text-slate-600">
        Al cambiarla se cerrará tu sesión y deberás iniciar de nuevo.
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
          type="password"
          placeholder="Contraseña actual"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="password"
          placeholder="Nueva contraseña (mín. 12, con mayúsculas, números y símbolo)"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="password"
          placeholder="Confirmar nueva contraseña"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p className="text-sm text-risk-high">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Cambiar contraseña
        </button>
      </form>
    </main>
  );
}
