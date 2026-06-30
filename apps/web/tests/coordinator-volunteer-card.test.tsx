import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn(async (..._args: unknown[]) => ({}) as unknown);
vi.mock('../src/lib/api-client', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  ApiError: class extends Error {},
}));

import { VolunteerCard } from '../src/features/coordinator/volunteer-card';
import type { VolunteerView } from '../src/lib/types';

function makeVolunteer(over: Partial<VolunteerView>): VolunteerView {
  return {
    id: 'v1',
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

describe('VolunteerCard', () => {
  beforeEach(() => apiFetch.mockClear());

  it('suspends an active volunteer via the reject endpoint', async () => {
    const onChange = vi.fn();
    render(<VolunteerCard volunteer={makeVolunteer({ estado: 'active' })} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /suspender/i }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/volunteers/v1/reject', { method: 'POST' }),
    );
    expect(onChange).toHaveBeenCalled();
  });

  it('activates a pending volunteer via the approve endpoint', async () => {
    render(<VolunteerCard volunteer={makeVolunteer({ estado: 'pending_approval' })} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /activar/i }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/volunteers/v1/approve', { method: 'POST' }),
    );
  });

  it('loads and adds confidential notes', async () => {
    apiFetch.mockResolvedValueOnce([
      { id: 'n1', voluntario_id: 'v1', autor_id: null, contenido: 'Riesgo de burnout', creada_en: new Date().toISOString() },
    ]);
    render(<VolunteerCard volunteer={makeVolunteer({})} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /notas confidenciales/i }));
    await waitFor(() => expect(screen.getByText('Riesgo de burnout')).toBeTruthy());
    expect(apiFetch).toHaveBeenCalledWith('/volunteers/v1/notes');

    apiFetch.mockResolvedValueOnce(undefined); // POST note
    apiFetch.mockResolvedValueOnce([]); // reload
    fireEvent.change(screen.getByPlaceholderText(/nota/i), { target: { value: 'Rotar la próxima semana' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/volunteers/v1/notes', {
        method: 'POST',
        body: { contenido: 'Rotar la próxima semana' },
      }),
    );
  });
});
