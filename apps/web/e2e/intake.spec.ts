import { expect, test } from '@playwright/test';

/**
 * Critical intake path: the Likert screen routes to a branch. Resilient to the
 * API being down (the page falls back to client-side routing for severe answers).
 */
test('the Likert screen routes the most severe answer to the red branch', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /en crisis/i }).click();
  await expect(page).toHaveURL(/\/intake\/roja/);
  await expect(page.getByText('Si estás en peligro, llama ahora')).toBeVisible();
});

test('the Likert screen routes a mild answer to the green branch', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /acompañamiento preventivo/i }).click();
  await expect(page).toHaveURL(/\/intake\/verde/);
});
