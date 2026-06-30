'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClipboardList, HeartHandshake, LayoutDashboard, LogOut, UserRound } from 'lucide-react';
import { clearSession, getRole } from '../lib/session';

const ROLE_LABEL: Record<string, string> = {
  psychologist: 'Psicólogo/a',
  coordinator: 'Coordinador/a',
  admin: 'Administrador/a',
};

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Exact-match the pathname for the active state. */
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: '/psicologo', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { href: '/psicologo/casos', label: 'Mis casos', icon: ClipboardList },
];

/**
 * Fixed navy sidebar for the psychologist area: brand, role-aware navigation
 * with outline icons, an active highlight and a profile card pinned at the
 * bottom. Client component because it reads the route and the local session.
 */
export function PsychologistSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(getRole());
  }, []);

  function signOut() {
    clearSession();
    router.push('/login');
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-navy text-white lg:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand">
          <HeartHandshake className="h-5 w-5 text-white" aria-hidden />
        </span>
        <span className="text-lg font-semibold tracking-tight">
          Sosten<span className="text-brand">Ve</span>
        </span>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const base = item.href.split('#')[0]!;
          const active = item.exact ? pathname === base : pathname.startsWith(base);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-navy-light text-white'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-5">
        <div className="rounded-2xl bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-light">
              <UserRound className="h-5 w-5 text-white" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{ROLE_LABEL[role ?? ''] ?? 'Profesional'}</p>
              <p className="truncate text-xs text-white/60">Federación de Psicólogos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  );
}
