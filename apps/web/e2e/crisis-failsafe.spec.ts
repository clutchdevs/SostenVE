import { expect, test } from '@playwright/test';

/**
 * Non-negotiable principle, end-to-end and backend-independent: even if the
 * crisis-lines API is completely unreachable, the red-branch screen must still
 * show crisis phone numbers (from the embedded fallback). Runs with only the web
 * server — we abort the API request on purpose.
 */
test('red branch shows crisis numbers even when the API is down', async ({ page }) => {
  await page.route('**/crisis-lines/active', (route) => route.abort());

  await page.goto('/intake/roja');

  await expect(page.getByText('Si estás en peligro, llama ahora')).toBeVisible();
  await expect(page.getByText('+584242907338')).toBeVisible();
  await expect(page.getByText('911')).toBeVisible();
});
