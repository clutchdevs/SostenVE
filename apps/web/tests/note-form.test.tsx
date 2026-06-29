import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NoteForm } from '../src/features/psychologist-portal/note-form';

describe('NoteForm (RF-4.3 mirror)', () => {
  it('warns and blocks a TEPT diagnosis before the 4-week window', () => {
    const today = new Date();
    render(<NoteForm onSubmit={vi.fn()} eventDate={today.toISOString()} now={today} />);

    fireEvent.change(screen.getByPlaceholderText('Evolución / contenido'), {
      target: { value: 'sesión' },
    });
    fireEvent.click(screen.getByLabelText('Diagnóstico de TEPT'));

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar nota' })).toHaveProperty('disabled', true);
  });

  it('allows a TEPT diagnosis after the window', () => {
    const now = new Date();
    const eventDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} eventDate={eventDate} now={now} />);

    fireEvent.change(screen.getByPlaceholderText('Evolución / contenido'), {
      target: { value: 'sesión' },
    });
    fireEvent.click(screen.getByLabelText('Diagnóstico de TEPT'));

    expect(screen.queryByRole('alert')).toBeNull();
    const submit = screen.getByRole('button', { name: 'Guardar nota' });
    expect(submit).toHaveProperty('disabled', false);
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
