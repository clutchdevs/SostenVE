'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { clearSession, getRole } from '../lib/session';

const ROLE_LABEL: Record<string, string> = {
  psychologist: 'Psicólogo',
  coordinator: 'Coordinador',
  admin: 'Administrador',
};

/** Role-aware primary destination for the workspace. */
const ROLE_HOME: Record<string, { href: string; label: string }> = {
  psychologist: { href: '/psicologo', label: 'Mis casos' },
  coordinator: { href: '/coordinador', label: 'Panel' },
  admin: { href: '/admin', label: 'Administración' },
};

/**
 * Top bar for staff areas (shown below `lg`, where the sidebar is hidden): brand,
 * role-aware navigation and sign-out. On phones the links collapse into a
 * hamburger menu so the bar doesn't overflow; from `sm` up they show inline.
 */
export function StaffHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setRole(getRole());
  }, []);

  // Close the mobile menu on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function signOut() {
    clearSession();
    router.push('/login');
  }

  const home = role ? ROLE_HOME[role] : undefined;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand" onClick={() => setOpen(false)}>
          PPV
        </Link>

        {/* Inline navigation (tablet and up) */}
        <nav className="hidden items-center gap-3 text-sm sm:flex">
          {home && (
            <Link href={home.href} className="font-medium text-slate-700 hover:text-brand">
              {home.label}
            </Link>
          )}
          {role && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {ROLE_LABEL[role] ?? role}
            </span>
          )}
          <Link href="/cambiar-contrasena" className="font-medium text-slate-700 hover:text-brand">
            Contraseña
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
        </nav>

        {/* Hamburger (phones) */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          aria-controls="staff-mobile-menu"
          className="inline-flex items-center justify-center rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 sm:hidden"
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {/* Collapsible menu (phones) */}
      {open && (
        <nav id="staff-mobile-menu" className="border-t border-slate-200 px-4 py-2 sm:hidden">
          {role && (
            <span className="mb-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {ROLE_LABEL[role] ?? role}
            </span>
          )}
          {home && (
            <Link
              href={home.href}
              className="block rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {home.label}
            </Link>
          )}
          <Link
            href="/cambiar-contrasena"
            className="block rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Contraseña
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
        </nav>
      )}
    </header>
  );
}
