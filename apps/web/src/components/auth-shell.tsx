import Link from 'next/link';
import type { ReactNode } from 'react';
import { ui } from '../lib/ui';

interface AuthShellProps {
  title: string;
  subtitle?: ReactNode;
  /** Optional back link (omitted on success/redirect screens). */
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}

/**
 * Centered card shell for the staff auth / onboarding screens (login, password
 * flows, coordinator sign-up) on the public PPV palette: soft blue canvas (from
 * the body / `ppv-tint`), serif heading, white `surface-card` panel with
 * `shadow-card`.
 */
export function AuthShell({
  title,
  subtitle,
  backHref,
  backLabel = '← Volver al inicio',
  children,
}: AuthShellProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      {backHref ? (
        <Link href={backHref} className={ui.link}>
          {backLabel}
        </Link>
      ) : null}
      <h1 className={`${backHref ? 'mt-4 ' : ''}text-2xl ${ui.heading}`}>{title}</h1>
      {subtitle ? <p className={`mt-1 ${ui.muted}`}>{subtitle}</p> : null}
      <div className={`mt-6 p-6 ${ui.card}`}>{children}</div>
    </main>
  );
}
