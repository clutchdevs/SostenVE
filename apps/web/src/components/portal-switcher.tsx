'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { getRoles, homePathForRole } from '../lib/session';

const PORTAL_LABEL: Record<string, string> = {
  psychologist: 'Portal de psicólogo',
  coordinator: 'Portal de coordinador',
  admin: 'Portal de administrador',
};

/**
 * Links to the OTHER portals a multi-role account (#133) can switch to — e.g. a
 * psychologist who is also a coordinator. Renders nothing for single-role users.
 * Styled for the dark navy staff sidebar.
 */
export function PortalSwitcher({ current }: { current: string }) {
  const [others, setOthers] = useState<string[]>([]);

  useEffect(() => {
    setOthers(getRoles().filter((r) => r !== current && PORTAL_LABEL[r]));
  }, [current]);

  if (others.length === 0) return null;

  return (
    <div className="mt-2 px-3">
      <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-white/40">
        Cambiar de portal
      </p>
      {others.map((r) => (
        <Link
          key={r}
          href={homePathForRole(r)}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeftRight className="h-[18px] w-[18px]" aria-hidden />
          {PORTAL_LABEL[r]}
        </Link>
      ))}
    </div>
  );
}
