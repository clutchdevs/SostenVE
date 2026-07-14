'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AuthShell } from '../../src/components/auth-shell';
import { SubmitButton } from '../../src/components/submit-button';
import { apiFetch } from '../../src/lib/api-client';
import { ui } from '../../src/lib/ui';

/**
 * Coordinator activation page (RF-2.6 / #133). Opened from the invitation email
 * link, which carries the single-use token as `?token=…`.
 *
 * Every coordinator is a registered psychologist first (canonical order): this
 * page never collects a profile or password. It resolves the token and, if the
 * invited email already has an account, the person confirms and the coordinator
 * role is added to it. If the email has no account yet, the invitation cannot be
 * accepted and the page points them to register as a psychologist first.
 */
interface InvitationInfo {
  email: string;
  nombre: string;
  cuenta_existente: boolean;
}

export default function CoordinatorOnboardingPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const lookup = useCallback(async (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    setLookupError('');
    setLookingUp(true);
    try {
      const res = await apiFetch<InvitationInfo>('/coordinators/invitation-info', {
        method: 'POST',
        auth: false,
        body: { token: t },
      });
      setInfo(res);
    } catch {
      setInfo(null);
      setLookupError('La invitación es inválida o ha expirado. Revisa el enlace o pide una nueva.');
    } finally {
      setLookingUp(false);
    }
  }, []);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('token');
    if (fromUrl) {
      setToken(fromUrl);
      void lookup(fromUrl);
    }
  }, [lookup]);

  // The token alone adds the coordinator role to the existing account.
  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await apiFetch('/coordinators/accept-invitation', {
        method: 'POST',
        auth: false,
        body: { token: token.trim() },
      });
      setDone(true);
      setTimeout(() => router.replace('/login-coordinador'), 1500);
    } catch {
      setError('No se pudo completar. Intenta de nuevo.');
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="¡Rol de coordinador añadido!">
        <p className={ui.muted}>Redirigiendo al inicio de sesión…</p>
      </AuthShell>
    );
  }

  // Step 1 — resolve the token before showing the right flow.
  if (!info) {
    return (
      <AuthShell
        title="Activar rol de coordinador"
        subtitle="Ingresa el token de tu invitación para continuar."
        backHref="/"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void lookup(token);
          }}
        >
          <input
            className={ui.field}
            placeholder="Token de invitación"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          {lookupError && <p className={ui.error}>{lookupError}</p>}
          <SubmitButton pending={lookingUp} disabled={!token.trim()} pendingText="Verificando…" className="w-full">
            Continuar
          </SubmitButton>
        </form>
      </AuthShell>
    );
  }

  // Step 2a — the email has no account: coordinators must be psychologists first.
  if (!info.cuenta_existente) {
    return (
      <AuthShell
        title="Primero regístrate como psicólogo"
        subtitle="El rol de coordinador se añade a una cuenta existente."
        backHref="/"
      >
        <div className="space-y-4">
          <p className={ui.muted}>
            El correo <strong>{info.email}</strong> aún no tiene una cuenta en PPV. Todo coordinador
            es primero un psicólogo registrado y validado. Regístrate como psicólogo y, una vez
            activa tu cuenta, vuelve a abrir este enlace para activar el rol de coordinador.
          </p>
          <Link
            href="/registro"
            className="inline-flex w-full items-center justify-center rounded-xl bg-ppv-blue px-4 py-2.5 font-medium text-white transition-colors hover:bg-ppv-blue-dark"
          >
            Registrarme como psicólogo
          </Link>
        </div>
      </AuthShell>
    );
  }

  // Step 2b — the email already has an account: confirm to add the role.
  return (
    <AuthShell
      title="Añadir rol de coordinador"
      subtitle="Este correo ya tiene una cuenta en PPV."
      backHref="/"
    >
      <div className="space-y-4">
        <p className={ui.muted}>
          La cuenta <strong>{info.email}</strong> ya existe. Al continuar se le añadirá el rol de{' '}
          <strong>coordinador</strong> y podrás iniciar sesión con tu contraseña actual.
        </p>
        {error && <p className={ui.error}>{error}</p>}
        <SubmitButton
          pending={busy}
          pendingText="Añadiendo…"
          className="w-full"
          onClick={() => void confirm()}
        >
          Añadir rol de coordinador
        </SubmitButton>
      </div>
    </AuthShell>
  );
}
