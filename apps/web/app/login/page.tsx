'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthShell } from '../../src/components/auth-shell';
import { SubmitButton } from '../../src/components/submit-button';
import { apiFetch } from '../../src/lib/api-client';
import { ui } from '../../src/lib/ui';
import { getRole, homePathForRole, isSessionActive, saveSession } from '../../src/lib/session';

/**
 * Optional post-login destination from `?next=…`. Only internal absolute paths
 * are honored (guards against open redirects); anything else falls back to the
 * role's home. Read from the URL directly so no Suspense boundary is required.
 */
function safeNext(): string | null {
  if (typeof window === 'undefined') return null;
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // An active (non-expired) session shouldn't see the login form again; send the
  // user to their portal (or the requested `next`). Only an expired or cleared
  // session shows the form.
  useEffect(() => {
    if (isSessionActive()) {
      router.replace(safeNext() ?? homePathForRole(getRole()));
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
      const roles = res.roles ?? [res.rol];
      saveSession(res.token, res.rol, roles);
      // Honor an explicit `next` (e.g. landing on /coordinador after activating
      // that role) only when the account actually holds it; else the role's home.
      const next = safeNext();
      const target =
        next && (next.startsWith('/coordinador') ? roles.includes('coordinator') : true)
          ? next
          : homePathForRole(res.rol);
      router.replace(target);
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
