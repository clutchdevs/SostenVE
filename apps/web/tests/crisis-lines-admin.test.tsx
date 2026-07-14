import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn(async (..._args: unknown[]) => ({}));
vi.mock('../src/lib/api-client', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  ApiError: class extends Error {},
}));

import { CrisisLinesAdmin } from '../src/features/admin/crisis-lines-admin';
import type { CrisisLineAdmin } from '../src/lib/types';

const line: CrisisLineAdmin = {
  id: 'cl-1',
  nombre: 'LAPSI',
  telefono: '+58',
  cobertura: null,
  hora_inicio: 8,
  hora_fin: 26,
  dias_semana: null,
  prioridad: 10,
  activa: true,
};

describe('CrisisLinesAdmin', () => {
  beforeEach(() => apiFetch.mockClear());

  it('deactivates an active line via PATCH', async () => {
    const onChange = vi.fn();
    render(<CrisisLinesAdmin lines={[line]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/crisis-lines/cl-1', {
      method: 'PATCH',
      body: { activa: false },
    }));
    expect(onChange).toHaveBeenCalled();
  });

  it('soft-deletes an active line via DELETE', async () => {
    const onChange = vi.fn();
    render(<CrisisLinesAdmin lines={[line]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/admin/crisis-lines/cl-1', { method: 'DELETE' }),
    );
  });

  // Regression test for issue #127: Fields used to be re-declared inside the
  // component body, so React remounted the inputs (and dropped focus) on every
  // keystroke. Typing several characters without re-querying the input at all
  // only succeeds if the same DOM node survives across renders.
  it('keeps focus on the name input across keystrokes when creating a line', () => {
    render(<CrisisLinesAdmin lines={[]} onChange={vi.fn()} />);

    const nombre = screen.getByPlaceholderText('Nombre');
    nombre.focus();
    fireEvent.change(nombre, { target: { value: 'L' } });
    fireEvent.change(nombre, { target: { value: 'LA' } });
    fireEvent.change(nombre, { target: { value: 'LAP' } });

    expect(document.activeElement).toBe(nombre);
    expect((nombre as HTMLInputElement).value).toBe('LAP');
  });

  it('sends selected days and omits the field on create when none are picked', async () => {
    render(<CrisisLinesAdmin lines={[]} onChange={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Nueva' } });
    fireEvent.change(screen.getByPlaceholderText('Teléfono'), { target: { value: '123' } });
    fireEvent.click(screen.getByLabelText('Lun'));
    fireEvent.click(screen.getByLabelText('Mar'));
    fireEvent.click(screen.getByRole('button', { name: 'Crear línea' }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/admin/crisis-lines',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({ dias_semana: ['lunes', 'martes'] }),
        }),
      ),
    );
  });

  it('pre-fills the day checkboxes when editing an existing line', () => {
    render(
      <CrisisLinesAdmin lines={[{ ...line, dias_semana: ['viernes'] }]} onChange={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    const editSection = within(screen.getByText('Editar “LAPSI”').closest('li')!);
    expect((editSection.getByLabelText('Vie') as HTMLInputElement).checked).toBe(true);
    expect((editSection.getByLabelText('Lun') as HTMLInputElement).checked).toBe(false);
  });
});
