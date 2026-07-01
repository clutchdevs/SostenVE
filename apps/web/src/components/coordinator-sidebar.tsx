'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, HeartHandshake, HeartPulse, LogOut, UserCog, Users } from 'lucide-react';
import { clearSession } from '../lib/session';

interface NavItem {
  href: string;
  label: string;
  icon: typeof HeartPulse;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: '/coordinador', label: 'Cola de casos', icon: HeartPulse, exact: true },
  { href: '/coordinador/psicologos', label: 'Psicólogos en atención', icon: Users },
  { href: '/coordinador/voluntarios', label: 'Voluntarios', icon: UserCog },
  { href: '/coordinador/reportes', label: 'Reportes', icon: BarChart3 },
];

/** Fixed navy sidebar for the coordination (operations) module. */
export function CoordinatorSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  function signOut() {
    clearSession();
    router.push('/login');
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col bg-navy text-white lg:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand">
          <HeartHandshake className="h-5 w-5 text-white" aria-hidden />
        </span>
        <span className="text-lg font-semibold tracking-tight">
          Sosten<span className="text-brand">Ve</span>
        </span>
      </div>

      <p className="px-6 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-white/40">
        Coordinación
      </p>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? 'bg-navy-light text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
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
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-navy">
              GC
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">G. Coordinador</p>
              <p className="flex items-center gap-1.5 text-xs text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                Guardia activa
              </p>
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
