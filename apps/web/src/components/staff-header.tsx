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

interface NavItem {
  href: string;
  label: string;
  /** Exact-match the pathname for the active state (used for each role's home). */
  exact?: boolean;
}

/**
 * Role-aware navigation, mirroring each workspace's desktop sidebar so the
 * small-screen menu offers the same destinations.
 */
const ROLE_NAV: Record<string, NavItem[]> = {
  psychologist: [
    { href: '/psicologo', label: 'Inicio', exact: true },
    { href: '/psicologo/casos', label: 'Mis casos' },
  ],
  coordinator: [
    { href: '/coordinador', label: 'Cola de casos', exact: true },
    { href: '/coordinador/psicologos', label: 'Psicólogos en atención' },
    { href: '/coordinador/voluntarios', label: 'Voluntarios' },
    { href: '/coordinador/reportes', label: 'Reportes' },
  ],
  admin: [
    { href: '/admin', label: 'Excepciones de registro', exact: true },
    { href: '/admin/padron', label: 'Padrón de psicólogos' },
    { href: '/admin/lineas', label: 'Líneas de crisis' },
    { href: '/admin/asignacion', label: 'Asignación de casos' },
    { href: '/admin/coordinadores', label: 'Coordinadores' },
    { href: '/admin/auditoria', label: 'Auditoría' },
  ],
};

/**
 * Top bar for staff areas (shown below `lg`, where the sidebar is hidden). The
 * full role navigation lives behind a hamburger menu so the bar never overflows
 * on phones/tablets and offers the same destinations as the desktop sidebar.
 */
export function StaffHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setRole(getRole());
  }, []);

  // Close the menu on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function signOut() {
    clearSession();
    router.push('/login');
  }

  const nav = role ? (ROLE_NAV[role] ?? []) : [];
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand" onClick={() => setOpen(false)}>
          PPV
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          aria-controls="staff-mobile-menu"
          className="inline-flex items-center justify-center rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {open && (
        <nav id="staff-mobile-menu" className="border-t border-slate-200 px-4 py-2">
          {role && (
            <span className="mb-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {ROLE_LABEL[role] ?? role}
            </span>
          )}
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item) ? 'page' : undefined}
              className={`block rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                isActive(item) ? 'bg-slate-100 text-brand' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/cambiar-contrasena"
            aria-current={pathname === '/cambiar-contrasena' ? 'page' : undefined}
            className={`block rounded-md px-2 py-2 text-sm font-medium transition-colors ${
              pathname === '/cambiar-contrasena'
                ? 'bg-slate-100 text-brand'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
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
