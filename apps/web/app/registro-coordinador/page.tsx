'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AuthShell } from '../../src/components/auth-shell';
import { SubmitButton } from '../../src/components/submit-button';
import { Spinner } from '../../src/components/spinner';
import { apiFetch } from '../../src/lib/api-client';
import { clearSession } from '../../src/lib/session';
import { ui } from '../../src/lib/ui';

/**
 * Coordinator activation page (RF-2.6 / #133). Opened from the invitation email
 * link, which carries the single-use token as `?token=…`.
 *
 * Every coordinator is a registered psychologist first (canonical order): this
 * page never collects a profile or password. Opening the link with a valid token
 * for an existing account activates the coordinator role automatically; the person
 * just acknowledges and continues to the coordinator portal. If the email has no
 * account yet, it points them to register as a psychologist first.
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
  const [granted, setGranted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [working, setWorking] = useState(false);
  // True until we know whether a token came in the URL — avoids flashing the
  // manual token form before the automatic activation kicks in.
  const [checking, setChecking] = useState(true);

  // Resolve the token and, for an existing account, activate the role right away.
  const resolve = useCallback(async (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    setErrorMsg('');
    setWorking(true);
    try {
      const res = await apiFetch<InvitationInfo>('/coordinators/invitation-info', {
        method: 'POST',
        auth: false,
        body: { token: t },
      });
      setInfo(res);
      if (res.cuenta_existente) {
        // Assign the coordinator role automatically — no extra confirmation.
        await apiFetch('/coordinators/accept-invitation', {
          method: 'POST',
          auth: false,
          body: { token: t },
        });
        setGranted(true);
      }
    } catch {
      setInfo(null);
      setErrorMsg('La invitación es inválida, ya fue usada o ha expirado. Revisa el enlace o pide una nueva.');
    } finally {
      setWorking(false);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('token');
    if (fromUrl) {
      setToken(fromUrl);
      void resolve(fromUrl);
    } else {
      setChecking(false);
    }
  }, [resolve]);

  // Activating from the URL token — show a spinner, never the empty form.
  if (checking || working) {
    return (
      <AuthShell title="Activando rol de coordinador" backHref="/">
        <p className={`inline-flex items-center gap-2 ${ui.muted}`}>
          <Spinner />
          Un momento…
        </p>
      </AuthShell>
    );
  }

  // Success — the role was assigned via the link. Acknowledge and go to the portal.
  if (granted) {
    return (
      <AuthShell title="¡Ya eres coordinador!" backHref="/">
        <div className="space-y-4">
          <p className={ui.muted}>
            Mediante tu enlace de invitación se activó el rol de <strong>coordinador</strong> en tu
            cuenta{info?.email ? ` (${info.email})` : ''}. Inicia sesión con tu contraseña actual
            para entrar al portal de coordinador.
          </p>
          <button
            type="button"
            onClick={() => {
              // Force a fresh login so the new token includes the coordinator role
              // (an existing stale session would otherwise bounce back to its portal),
              // then land straight on the coordinator portal.
              clearSession();
              router.replace('/login?next=/coordinador');
            }}
            className="inline-flex w-full items-center justify-center rounded-xl bg-ppv-blue px-4 py-2.5 font-medium text-white transition-colors hover:bg-ppv-blue-dark"
          >
            Aceptar
          </button>
        </div>
      </AuthShell>
    );
  }

  // The email has no account: coordinators must be psychologists first.
  if (info && !info.cuenta_existente) {
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

  // No URL token (or the token failed): let the person paste it manually.
  return (
    <AuthShell
      title="Activar rol de coordinador"
      subtitle="Abre el enlace de tu invitación para activar el rol automáticamente."
      backHref="/"
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void resolve(token);
        }}
      >
        <input
          className={ui.field}
          placeholder="Token de invitación"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        {errorMsg && <p className={ui.error}>{errorMsg}</p>}
        <SubmitButton pending={working} disabled={!token.trim()} pendingText="Activando…" className="w-full">
          Activar
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
