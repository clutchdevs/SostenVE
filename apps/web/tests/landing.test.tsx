import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LandingPage from '../app/page';

describe('landing page', () => {
  it('offers a path to request support and a staff access', () => {
    render(<LandingPage />);
    const support = screen.getByRole('link', { name: /necesito apoyo/i });
    const staff = screen.getByRole('link', { name: /ingresar como profesional/i });
    expect(support.getAttribute('href')).toBe('/intake');
    expect(staff.getAttribute('href')).toBe('/login');
  });

  it('keeps the crisis lines one tap away', () => {
    render(<LandingPage />);
    expect(screen.getByRole('link', { name: /líneas de crisis/i }).getAttribute('href')).toBe(
      '/intake/roja',
    );
  });
});
