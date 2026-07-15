import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn(async (..._args: unknown[]) => ({}) as unknown);
vi.mock('../src/lib/api-client', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  ApiError: class extends Error {},
}));

import { CaseActionModal } from '../src/features/coordinator/case-action-modal';
import type { CaseSummary, VolunteerView } from '../src/lib/types';

const CASO = { caso_id: 'case-abcd' } as unknown as CaseSummary;

function psy(over: Partial<VolunteerView>): VolunteerView {
  return {
    id: 'p1',
    nombre: 'Dra. Pérez',
    cedula_profesional: 'FPV-1',
    email: 'p@example.com',
    especialidad: 'Clínica',
    rol: 'psychologist',
    estado: 'active',
    motivo_excepcion: null,
    creado_en: new Date().toISOString(),
    ...over,
  };
}

describe('CaseActionModal — reassign only to online psychologists (issue #130)', () => {
  it('lists online psychologists and omits offline ones', () => {
    render(
      <CaseActionModal
        caso={CASO}
        mode="reassign"
        psychologists={[
          psy({ id: 'on', nombre: 'Dra. Online', en_linea: true }),
          psy({ id: 'off', nombre: 'Dr. Offline', en_linea: false }),
        ]}
        onCancel={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByRole('option', { name: /Dra\. Online/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Dr\. Offline/ })).toBeNull();
  });

  it('shows an empty state and disables the action when nobody is online', () => {
    render(
      <CaseActionModal
        caso={CASO}
        mode="reassign"
        psychologists={[psy({ id: 'off', en_linea: false })]}
        onCancel={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByText(/No hay psicólogos conectados/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Reasignar$/ }).hasAttribute('disabled')).toBe(true);
  });
});
