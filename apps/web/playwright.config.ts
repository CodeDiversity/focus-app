import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import {
  E2E_API_PORT,
  E2E_WEB_PORT,
  resolveTestEnv,
  SELF_CONTAINED_BASE_URL,
} from './e2e/test-env';

/**
 * Playwright configuration for StudyPilot E2E tests.
 *
 * Self-contained by default (SP-119): a dedicated throwaway `*_e2e_test`
 * database (created + migrated in global setup, dropped in global teardown)
 * with test-only instances — API on :4100 and Vite on :3100 proxying `/api`
 * to it. The developer stack (Vite :3000, API :4000, developer database) is
 * neither required nor touched.
 *
 * Setting `E2E_BASE_URL` runs the browser against an externally provided
 * stack instead and skips the self-contained servers and database lifecycle.
 *
 * Run the suite with `pnpm test:e2e` from the repo root.
 */

// Resolved (and fail-fast validated) once, at config load — before the first
// test. Throws an actionable error when a self-contained run cannot be
// prepared (missing/invalid DATABASE_URL, see e2e/test-env.ts).
const testEnv = resolveTestEnv();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'on-failure' }]],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? SELF_CONTAINED_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Self-contained servers only; external-stack mode (E2E_BASE_URL) runs
  // against the caller's stack, so no servers are started.
  webServer:
    testEnv.mode === 'self-contained'
      ? [
          {
            // Test-only API: built into apps/api/dist-test (tsconfig.e2e.json)
            // so it never touches the developer's running `nest --watch`
            // output (dist/). The derived DATABASE_URL is passed explicitly —
            // dotenv never overrides existing variables, so the API's own
            // .env.local still supplies JWT_SECRET etc.
            command: 'pnpm start:e2e',
            cwd: path.resolve(__dirname, '../api'),
            // Readiness probe: a protected route. Playwright 1.64's URL check
            // requires a 200–403 status (a 404 root — and its /index.html
            // fallback — would never count), and the global APP_GUARD answers
            // 401 for any unauthenticated protected route once the app has
            // fully booted (module init incl. the DB connection is done
            // before the server listens). The API has no /health route, and
            // adding one would be a production change (AC4).
            url: `http://localhost:${E2E_API_PORT}/semesters`,
            env: { PORT: String(E2E_API_PORT), DATABASE_URL: testEnv.testDatabaseUrl },
            // Fresh processes bound to the freshly migrated database, every run.
            reuseExistingServer: false,
            // First run compiles the whole app into dist-test — allow a full build.
            timeout: 180_000,
          },
          {
            // Test-only web instance; the proxy target is env-driven in
            // vite.config.ts (default http://localhost:4000 keeps dev behavior).
            // `pnpm exec vite` instead of `pnpm dev -- --port …`: pnpm 8
            // forwards the `--` separator as a literal argument, so vite would
            // never see the flags and silently fall back to the config port
            // (3000, occupied by the developer server → wrong port).
            command: `pnpm exec vite --port ${E2E_WEB_PORT} --strictPort`,
            cwd: path.resolve(__dirname, '../web'),
            url: `http://localhost:${E2E_WEB_PORT}/`,
            env: { E2E_API_PROXY_TARGET: `http://localhost:${E2E_API_PORT}` },
            reuseExistingServer: false,
            timeout: 120_000,
          },
        ]
      : undefined,
});
