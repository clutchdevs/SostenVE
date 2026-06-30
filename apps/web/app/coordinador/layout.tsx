import type { ReactNode } from 'react';
import { CoordinatorSidebar } from '../../src/components/coordinator-sidebar';
import { SessionGuard } from '../../src/components/session-guard';
import { StaffHeader } from '../../src/components/staff-header';

/**
 * Coordination (operations center) shell: fixed navy sidebar (240px) on desktop
 * over the warm off-white canvas, compact staff header as the small-screen
 * fallback.
 */
export default function CoordinatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <SessionGuard />
      <CoordinatorSidebar />
      <div className="lg:hidden">
        <StaffHeader />
      </div>
      <main className="px-5 py-8 sm:px-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
