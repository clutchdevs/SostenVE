'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthShell } from '../../src/components/auth-shell';
import { apiFetch } from '../../src/lib/api-client';
import { ui } from '../../src/lib/ui';

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
      <AuthShell title="Revisa tu correo">
        <p className={ui.muted}>
          Si el correo corresponde a una cuenta activa, te enviamos un enlace para restablecer tu
          contraseña. El enlace vence en 1 hora.
        </p>
        <Link href="/login" className={`mt-4 inline-block ${ui.link}`}>
          ← Volver al inicio de sesión
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Ingresa tu correo y te enviaremos un enlace para definir una nueva contraseña."
      backHref="/login"
      backLabel="← Volver al inicio de sesión"
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className={ui.field}
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={busy || !email} className={`w-full ${ui.primaryBtn}`}>
          Enviar enlace
        </button>
      </form>
    </AuthShell>
  );
}
