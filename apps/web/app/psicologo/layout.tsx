import type { ReactNode } from 'react';
import { PsychologistSidebar } from '../../src/components/psychologist-sidebar';
import { SessionGuard } from '../../src/components/session-guard';
import { StaffHeader } from '../../src/components/staff-header';

/**
 * Psychologist workspace shell: a fixed navy sidebar on desktop (with a compact
 * staff header as the small-screen fallback) over a warm off-white canvas. The
 * content column is offset by the sidebar width and centered with generous
 * margins (12-column friendly, lots of whitespace).
 */
export default function PsychologistLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <SessionGuard />
      <PsychologistSidebar />
      <div className="lg:hidden">
        <StaffHeader />
      </div>
      <main className="px-5 py-8 sm:px-8 lg:ml-64">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
