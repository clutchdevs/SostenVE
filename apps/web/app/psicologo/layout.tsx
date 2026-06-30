import type { ReactNode } from 'react';
import { SessionGuard } from '../../src/components/session-guard';
import { StaffHeader } from '../../src/components/staff-header';

export default function PsychologistLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <SessionGuard />
      <StaffHeader />
      {children}
    </div>
  );
}
