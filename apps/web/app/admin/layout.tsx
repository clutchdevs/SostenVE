import type { ReactNode } from 'react';
import { AdminSidebar } from '../../src/components/admin-sidebar';
import { SessionGuard } from '../../src/components/session-guard';
import { StaffHeader } from '../../src/components/staff-header';

/**
 * Administration shell: fixed navy sidebar (240px) on desktop over a warm
 * off-white canvas, with the compact staff header as the small-screen fallback.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <SessionGuard />
      <AdminSidebar />
      <div className="lg:hidden">
        <StaffHeader />
      </div>
      <main className="px-5 py-8 sm:px-8 lg:ml-60">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
