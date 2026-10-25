import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for StudyPilot E2E tests.
 *
 * Tests run against a running dev stack:
 * - Vite dev server on http://localhost:3000 (start with `pnpm dev`)
 * - The API it proxies to on port 4000
 *
 * Run the suite with `pnpm test:e2e` from the repo root.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'on-failure' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
