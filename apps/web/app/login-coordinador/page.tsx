'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../src/lib/api-client';
import { getRole, homePathForRole, isSessionActive, saveSession } from '../../src/lib/session';

/**
 * Dedicated coordinator login route (RF-2.7, optional). Functionally it shares
 * the `/auth/login` endpoint with the staff login; it exists as a separate,
 * coordinator-branded entry point and links to the invitation flow (RF-2.6).
 */
export default function CoordinatorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isSessionActive()) {
      router.replace(homePathForRole(getRole()));
    } else {
      setChecking(false);
    }
  }, [router]);

  async function submit() {
    setError('');
    try {
      const res = await apiFetch<{ token: string; rol: string }>('/auth/login', {
        method: 'POST',
        auth: false,
        body: { email, contrasena: password },
      });
      saveSession(res.token, res.rol);
      router.replace(homePathForRole(res.rol));
    } catch {
      setError('Credenciales inválidas');
    }
  }

  if (checking) return null;

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <Link href="/" className="text-sm text-brand underline">
        ← Volver al inicio
      </Link>
      <h1 className="mt-4 text-xl font-bold text-brand">Acceso de coordinación</h1>
      <p className="mt-1 text-sm text-slate-600">Coordinadores de la FPV.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className="w-full rounded-md border px-3 py-2"
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-risk-high">{error}</p>}
        <button type="submit" className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white">
          Entrar
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        ¿Recibiste una invitación?{' '}
        <Link href="/registro-coordinador" className="text-brand underline">
          Actívala aquí
        </Link>
        .
      </p>
    </main>
  );
}
