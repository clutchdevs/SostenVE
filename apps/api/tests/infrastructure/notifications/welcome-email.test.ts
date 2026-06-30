import { describe, expect, it } from 'vitest';
import { buildPendingEmail, buildWelcomeEmail } from '../../../src/infrastructure/notifications/welcome-email';

describe('welcome email', () => {
  it('includes the temporary password and the login URL (RF-2.2.4)', () => {
    const { subject, body } = buildWelcomeEmail(
      { email: 'ana@example.com', fullName: 'Ana', temporaryPassword: 'TEMP-PASS-123' },
      'http://localhost:3000/login',
    );
    expect(subject).toMatch(/bienvenido/i);
    expect(body).toContain('TEMP-PASS-123');
    expect(body).toContain('http://localhost:3000/login');
    expect(body).toContain('ana@example.com');
  });

  it('pending email carries no credentials', () => {
    const { body } = buildPendingEmail({ email: 'ana@example.com', fullName: 'Ana' });
    expect(body).toMatch(/revisión/i);
    expect(body).not.toMatch(/contraseña temporal/i);
  });
});
