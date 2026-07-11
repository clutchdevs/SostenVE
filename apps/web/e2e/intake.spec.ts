import { expect, test } from '@playwright/test';

/**
 * Critical intake path through the new landing: home → "Necesito apoyo" → Likert
 * → branch. Resilient to the API being down (client-side fallback routing).
 */
test('home routes to intake and the most severe answer reaches the red branch', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /necesito apoyo/i }).click();
  await expect(page).toHaveURL(/\/intake$/);

  await page.getByRole('button', { name: /en crisis/i }).click();
  await expect(page).toHaveURL(/\/intake\/roja/);
  await expect(page.getByText('Si estás en peligro, llama ahora')).toBeVisible();
});

test('a mild answer routes to the green branch', async ({ page }) => {
  await page.goto('/intake');
  await page.getByRole('button', { name: /acompañamiento preventivo/i }).click();
  await expect(page).toHaveURL(/\/intake\/verde/);
});

test('the landing offers staff access', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /ingresar como profesional/i }).click();
  await expect(page).toHaveURL(/\/login/);
});
