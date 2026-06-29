'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getRole } from '../lib/session';

const ROLE_LABEL: Record<string, string> = {
  psychologist: 'Psicólogo',
  coordinator: 'Coordinador',
  admin: 'Administrador',
};

/** Top bar for staff areas: brand, role-aware navigation and sign-out. */
export function StaffHeader() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(getRole());
  }, []);

  function signOut() {
    clearSession();
    router.push('/login');
  }

  const isCoordinator = role === 'coordinator' || role === 'admin';

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand">
          Sostén
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {role === 'psychologist' && (
            <Link href="/psicologo" className="font-medium text-slate-700 hover:text-brand">
              Mis casos
            </Link>
          )}
          {isCoordinator && (
            <Link href="/coordinador" className="font-medium text-slate-700 hover:text-brand">
              Panel
            </Link>
          )}
          {role && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {ROLE_LABEL[role] ?? role}
            </span>
          )}
          <button
            type="button"
            onClick={signOut}
            className="rounded-md border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
        </nav>
      </div>
    </header>
  );
}
