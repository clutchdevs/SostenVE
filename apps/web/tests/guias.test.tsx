import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();
vi.mock('../src/lib/api-client', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  ApiError: class extends Error {},
}));

import GuidesPage from '../app/guias/page';
import LandingPage from '../app/page';

const GUIDES = {
  version: 'v0.1.0-draft',
  updated_at: '2026-06-30',
  guides: [
    { id: 'respiracion', title: 'Respiración para calmar la angustia', summary: 'Ejercicio breve.', steps: ['Inhala', 'Exhala'] },
  ],
};

/**
 * Dispatch the mock by path so the shared ConsentNotice (which also calls
 * apiFetch on '/consent/requester') doesn't consume a one-shot mock meant for
 * the '/pap' request. `pap` decides how the guides request resolves/rejects.
 */
function mockApi(pap: () => Promise<unknown>) {
  apiFetch.mockImplementation((path: string) => {
    if (path === '/consent/requester') {
      return Promise.resolve({ version: 'v0.1.0-draft', updated_at: '2026-07-01', text: 'aviso' });
    }
    if (path === '/pap') return pap();
    return Promise.resolve(undefined);
  });
}

describe('PAP self-help guides page', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('renders the guides from the API with their steps', async () => {
    mockApi(() => Promise.resolve(GUIDES));

    render(<GuidesPage />);

    await waitFor(() =>
      expect(screen.getByText('Respiración para calmar la angustia')).toBeTruthy(),
    );
    expect(apiFetch).toHaveBeenCalledWith('/pap', { auth: false });
    expect(screen.getByText('Inhala')).toBeTruthy();
    // Crisis lines stay one tap away from the self-help guides.
    expect(screen.getByRole('link', { name: /líneas de crisis/i }).getAttribute('href')).toBe(
      '/intake/roja',
    );
  });

  it('shows an error message when the guides cannot be loaded', async () => {
    mockApi(() => Promise.reject(new Error('down')));
    render(<GuidesPage />);
    await waitFor(() => expect(screen.getByText(/no se pudieron cargar/i)).toBeTruthy());
  });
});

describe('landing access to the guides', () => {
  it('links to the PAP guides from the home page', () => {
    render(<LandingPage />);
    expect(screen.getByRole('link', { name: /guías de autoayuda/i }).getAttribute('href')).toBe(
      '/guias',
    );
  });
});
