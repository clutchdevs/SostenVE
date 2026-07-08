import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});
