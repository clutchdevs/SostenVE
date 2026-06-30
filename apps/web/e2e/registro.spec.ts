import { expect, test } from '@playwright/test';

/**
 * Registration consent gate (RF-2.1.1), backend-independent: the consent endpoint
 * and the register POST are mocked so this runs with only the web server. The
 * submit button must stay disabled until the consent checkbox is ticked.
 */
test('registration is blocked until the informed consent is accepted', async ({ page }) => {
  await page.route('**/consent/active', (route) =>
    route.fulfill({
      json: { version: 'v0.1.0-draft', updated_at: '2026-06-29', text: 'Texto de prueba del consentimiento.' },
    }),
  );
  await page.route('**/volunteers/register', (route) =>
    route.fulfill({ status: 202, json: { voluntario_id: 'vol-1', estado_validacion: 'validado' } }),
  );

  await page.goto('/registro');
  await expect(page.getByText('Texto de prueba del consentimiento.')).toBeVisible();

  await page.getByPlaceholder('Nombre completo').fill('Ana Test');
  await page.getByPlaceholder('Cédula profesional (FPV)').fill('FPV-12345678');
  await page.getByPlaceholder('Correo').fill('ana@example.com');
  await page.getByPlaceholder('Contraseña (mínimo 8 caracteres)').fill('a-strong-password');

  const submit = page.getByRole('button', { name: /registrarme/i });
  await expect(submit).toBeDisabled();

  await page.getByRole('checkbox').check();
  await expect(submit).toBeEnabled();

  await submit.click();
  await expect(page.getByText(/registro recibido/i)).toBeVisible();
});
