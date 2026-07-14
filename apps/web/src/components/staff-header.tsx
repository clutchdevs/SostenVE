'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeftRight, Menu, X } from 'lucide-react';
import { clearSession, getRoles, homePathForRole } from '../lib/session';

const ROLE_LABEL: Record<string, string> = {
  psychologist: 'Psicólogo',
  coordinator: 'Coordinador',
  admin: 'Administrador',
};

const PORTAL_LABEL: Record<string, string> = {
  psychologist: 'Portal de psicólogo',
  coordinator: 'Portal de coordinador',
  admin: 'Portal de administrador',
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

/** Which portal the current route belongs to. */
function activeRoleFromPath(pathname: string): string {
  if (pathname.startsWith('/coordinador')) return 'coordinator';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'psychologist';
}

/**
 * Top bar for staff areas (shown below `lg`, where the sidebar is hidden). The
 * current portal's navigation lives behind a hamburger menu, plus a "switch
 * portal" section for accounts that hold more than one role (#133).
 */
export function StaffHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [roles, setRoles] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setRoles(getRoles());
  }, []);

  // Close the menu on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function signOut() {
    clearSession();
    router.push('/login');
  }

  const activeRole = activeRoleFromPath(pathname);
  const nav = ROLE_NAV[activeRole] ?? [];
  // Other portals this account can switch to (multi-role, #133).
  const otherPortals = roles.filter((r) => r !== activeRole && PORTAL_LABEL[r] && ROLE_NAV[r]);
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
          <span className="mb-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {ROLE_LABEL[activeRole] ?? activeRole}
          </span>
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

          {otherPortals.length > 0 && (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Cambiar de portal
              </p>
              {otherPortals.map((r) => (
                <Link
                  key={r}
                  href={homePathForRole(r)}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeftRight className="h-4 w-4" aria-hidden />
                  {PORTAL_LABEL[r]}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-2 border-t border-slate-100 pt-2">
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
          </div>
        </nav>
      )}
    </header>
  );
}
