'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '../../src/lib/api-client';

/**
 * Public "forgot password" request (RF-2.2.4, issue #36). We always show the same
 * confirmation whether or not the email maps to an account, so the page can't be
 * used to probe which emails exist.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        auth: false,
        body: { email },
      });
    } catch {
      // Ignore errors: the confirmation is intentionally uniform.
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-xl font-bold text-brand">Revisa tu correo</h1>
        <p className="mt-2 text-sm text-slate-600">
          Si el correo corresponde a una cuenta activa, te enviamos un enlace para restablecer tu
          contraseña. El enlace vence en 1 hora.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm text-brand underline">
          ← Volver al inicio de sesión
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <Link href="/login" className="text-sm text-brand underline">
        ← Volver al inicio de sesión
      </Link>
      <h1 className="mt-4 text-xl font-bold text-brand">Recuperar contraseña</h1>
      <p className="mt-1 text-sm text-slate-600">
        Ingresa tu correo y te enviaremos un enlace para definir una nueva contraseña.
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
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy || !email}
          className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Enviar enlace
        </button>
      </form>
    </main>
  );
}
