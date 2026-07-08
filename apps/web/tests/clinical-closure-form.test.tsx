import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClinicalClosureForm } from '../src/features/psychologist-portal/clinical-closure-form';

describe('ClinicalClosureForm (Module 4)', () => {
  it('shows the quick-close branch when the requester was not contacted', () => {
    render(<ClinicalClosureForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    // The "Motivo del cierre" select for no-contact appears; clinical chips do not.
    expect(screen.getByText('Motivo del cierre')).toBeTruthy();
    expect(screen.queryByText('Sintomatología')).toBeNull();
  });

  it('shows the full clinical branch when contacted and submits a closure', () => {
    const onSubmit = vi.fn();
    render(<ClinicalClosureForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));

    expect(screen.getByText('Sintomatología')).toBeTruthy();
    // Pick a close reason (required) and submit.
    fireEvent.change(screen.getByLabelText(/Motivo del cierre/i), {
      target: { value: 'finalizado' },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar y cerrar/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ contacto: true, motivo_cierre: 'finalizado' });
  });
});
