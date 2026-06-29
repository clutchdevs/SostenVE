import type { ReactNode } from 'react';
import { StaffHeader } from '../../src/components/staff-header';

export default function PsychologistLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <StaffHeader />
      {children}
    </div>
  );
}
