import { describe, expect, it } from 'vitest';
import {
  buildInvitationEmail,
  buildPasswordResetEmail,
  buildPendingEmail,
  buildWelcomeEmail,
} from '../../../src/infrastructure/notifications/welcome-email';

describe('welcome email', () => {
  it('includes the temporary password and the login URL in text and HTML (RF-2.2.4)', () => {
    const { subject, text, html } = buildWelcomeEmail(
      { email: 'ana@example.com', fullName: 'Ana', temporaryPassword: 'TEMP-PASS-123' },
      'http://localhost:3000/login',
    );
    expect(subject).toMatch(/bienvenido/i);
    for (const part of [text, html]) {
      expect(part).toContain('TEMP-PASS-123');
      expect(part).toContain('http://localhost:3000/login');
      expect(part).toContain('ana@example.com');
    }
    // HTML is a branded document with the brand colors.
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('#191a36');
    expect(html).toContain('#5582c2');
  });

  it('pending email carries no credentials', () => {
    const { text, html } = buildPendingEmail({ email: 'ana@example.com', fullName: 'Ana' });
    expect(text).toMatch(/revisión/i);
    expect(text).not.toMatch(/contraseña temporal/i);
    expect(html).not.toMatch(/contraseña temporal/i);
  });

  it('password reset email carries the reset link and expiry (RF-2.2.4)', () => {
    const expiresAt = new Date('2026-07-01T12:00:00Z');
    const { subject, text, html } = buildPasswordResetEmail({
      email: 'ana@example.com',
      fullName: 'Ana',
      resetUrl: 'http://localhost:3000/restablecer-contrasena?token=abc123',
      expiresAt,
    });
    expect(subject).toMatch(/recuperación/i);
    for (const part of [text, html]) {
      expect(part).toContain('http://localhost:3000/restablecer-contrasena?token=abc123');
      expect(part).toContain(expiresAt.toLocaleString('es-VE'));
    }
  });

  it('invitation email carries the accept link and escapes the recipient name', () => {
    const expiresAt = new Date('2026-07-01T12:00:00Z');
    const { text, html } = buildInvitationEmail({
      email: 'co@example.com',
      fullName: 'Coord <script>',
      acceptUrl: 'http://localhost:3000/registro-coordinador?token=xyz',
      expiresAt,
    });
    expect(text).toContain('http://localhost:3000/registro-coordinador?token=xyz');
    expect(html).toContain('http://localhost:3000/registro-coordinador?token=xyz');
    // User-supplied content is HTML-escaped (no raw <script>).
    expect(html).not.toContain('<script>');
    expect(html).toContain('Coord &lt;script&gt;');
  });
});
