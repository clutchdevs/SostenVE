import { expect, test } from '@playwright/test';

/**
 * Staff portal smoke. Requires the API + Supabase running and a seeded, active
 * volunteer; provide its credentials via env to enable. Skipped otherwise.
 */
const email = process.env.E2E_STAFF_EMAIL;
const password = process.env.E2E_STAFF_PASSWORD;

test.describe('staff portals', () => {
  test.skip(
    !email || !password,
    'Set E2E_STAFF_EMAIL/E2E_STAFF_PASSWORD (and seed an active account) to run',
  );

  test('a staff member can log in and reach their portal', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Correo').fill(email as string);
    await page.getByPlaceholder('Contraseña').fill(password as string);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/(psicologo|coordinador)/);
  });
});
