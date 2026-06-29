import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config (scaffold). Install browsers once with `npm run e2e:install`,
 * then `npm run e2e`. Specs that hit the API (intake/staff) need the API running
 * (`npm run dev -w @sostenve/api`) with Supabase up and `.env` set; the
 * `crisis-failsafe` spec runs with only the web server (it aborts the API route).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
