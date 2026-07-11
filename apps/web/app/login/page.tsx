'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthShell } from '../../src/components/auth-shell';
import { SubmitButton } from '../../src/components/submit-button';
import { apiFetch } from '../../src/lib/api-client';
import { ui } from '../../src/lib/ui';
import { getRole, homePathForRole, isSessionActive, saveSession } from '../../src/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // An active (non-expired) session shouldn't see the login form again; send the
  // user to their portal. Only an expired or cleared session shows the form.
  useEffect(() => {
    if (isSessionActive()) {
      router.replace(homePathForRole(getRole()));
    } else {
      setChecking(false);
    }
  }, [router]);

  async function submit() {
    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ token: string; rol: string; roles?: string[] }>('/auth/login', {
        method: 'POST',
        auth: false,
        body: { email, contrasena: password },
      });
      saveSession(res.token, res.rol, res.roles ?? [res.rol]);
      router.replace(homePathForRole(res.rol));
      // Keep the button disabled through the redirect; the page unmounts.
    } catch {
      setError('Credenciales inválidas');
      setSubmitting(false);
    }
  }

  if (checking) return null;

  return (
    <AuthShell title="Acceso de personal" subtitle="Psicólogos y coordinadores de la FPV." backHref="/">
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
        <input
          className={ui.field}
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className={ui.error}>{error}</p>}
        <SubmitButton pending={submitting} pendingText="Entrando…" className="w-full">
          Entrar
        </SubmitButton>
      </form>
      <Link href="/recuperar-contrasena" className={`mt-4 inline-block ${ui.link}`}>
        ¿Olvidaste tu contraseña?
      </Link>
    </AuthShell>
  );
}
