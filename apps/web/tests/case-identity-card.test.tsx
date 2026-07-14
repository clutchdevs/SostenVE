import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CaseIdentityCard } from '../src/features/psychologist-portal/case-identity-card';
import type { CaseContactView, CaseSummary } from '../src/lib/types';

function caso(): CaseSummary {
  return {
    caso_id: 'c1',
    rama: 'GREEN',
    nivel_riesgo: 'seguimiento',
    score_urgencia: 1,
    estado: 'assigned',
    creado_en: new Date().toISOString(),
    sla_vence_en: null,
  };
}

function contact(contacto: string): CaseContactView {
  return { nombre: 'Ana', contacto };
}

// Issue #129: whatever format the contact was stored in, the psychologist's
// WhatsApp and call links must resolve to a working international number.
describe('CaseIdentityCard — WhatsApp/call links (issue #129)', () => {
  it('builds a wa.me link in international format from an already-normalized contact', () => {
    render(<CaseIdentityCard caso={caso()} contacto={contact('584141234567')} />);
    const link = screen.getByRole('link', { name: 'WhatsApp' }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://wa.me/584141234567');
  });

  it('normalizes a legacy national-format (0-prefixed) contact for the wa.me link', () => {
    render(<CaseIdentityCard caso={caso()} contacto={contact('0414-1234567')} />);
    const link = screen.getByRole('link', { name: 'WhatsApp' }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://wa.me/584141234567');
  });

  it('builds a tel: link with a leading + for either stored format', () => {
    render(<CaseIdentityCard caso={caso()} contacto={contact('0414-1234567')} />);
    const link = screen.getByRole('link', { name: /^Llamar/ }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('tel:+584141234567');
  });
});
