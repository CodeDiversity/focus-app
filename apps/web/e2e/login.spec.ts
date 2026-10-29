import { test, expect } from '@playwright/test';

/**
 * Smoke test: the full auth stack works end to end.
 *
 * Registers a fresh user through the real API, then logs in through the real
 * login UI and asserts an authenticated destination renders. A missing or
 * broken API/DB surfaces here as a failed registration, not a silent pass.
 */

// Unique per run AND per worker. With `fullyParallel`, Playwright may split
// this file's tests across workers; each worker loads this module and runs
// the file's beforeAll with its own copy of `testUser`. A bare Date.now()
// collides when two workers load in the same millisecond (duplicate email →
// 409), so a random suffix makes every worker's email unique.
const testUser = {
  name: 'E2E Smoke User',
  // Web Crypto (global in Node ≥ 19) — no node:crypto import needed.
  email: `e2e-smoke-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.com`,
  password: 'E2eSmokePassword123!',
};

test.beforeAll(async ({ request }) => {
  let response;
  try {
    response = await request.post('/api/auth/register', {
      data: { name: testUser.name, email: testUser.email, password: testUser.password },
    });
  } catch (error) {
    // Connection-level failure (API or Vite proxy down) would otherwise
    // surface as a raw ECONNREFUSED inside beforeAll — say what to do.
    // The tail is mode-conditional (SP-119, D119-5): self-contained (default)
    // mode → "ensure Postgres is running" (the test stack starts
    // automatically); E2E_BASE_URL external-stack mode → keep the SP-116 AC2
    // semantics (the externally provided stack must be running).
    const remedy = process.env.E2E_BASE_URL
      ? `The externally provided stack at ${process.env.E2E_BASE_URL} must be running — start it, then re-run the tests.`
      : 'The self-contained test stack is started automatically — ensure Postgres is running, then re-run `pnpm test:e2e`.';
    throw new Error(
      `Could not reach the API at ${process.env.E2E_BASE_URL ?? 'http://localhost:3100'}/api ` +
        `(${(error as Error).message}). ${remedy}`
    );
  }

  // Emails are unique per run + worker, so anything other than 201 is a real
  // problem (API down, DB unreachable, validation) — surface the body so the
  // failure is diagnosable at a glance instead of a timeout cascade.
  if (response.status() !== 201) {
    const body = (await response.text().catch(() => '')).slice(0, 200);
    // Mode-conditional tail (SP-119, D119-5), same as the catch above.
    const remedy = process.env.E2E_BASE_URL
      ? `The externally provided stack at ${process.env.E2E_BASE_URL} must be running and able to reach its database.`
      : 'The API must be running and able to reach its database — ensure Postgres is running, then re-run `pnpm test:e2e`.';
    throw new Error(
      `Test user registration failed with status ${response.status()}${body ? ` — ${body}` : ''}. ${remedy}`
    );
  }
});

test('login with valid credentials reaches an authenticated page', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill(testUser.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(testUser.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Login lands on onboarding for new accounts (or dashboard once onboarded).
  await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 10_000 });
});

test('login with a wrong password shows an error and stays on /login', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill(testUser.email);
  await page.getByRole('textbox', { name: 'Password' }).fill('WrongPassword123!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // The API's uniform 401 message is surfaced as an error toast (LoginPage
  // catch → toast.error); the user must not be navigated away from /login.
  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
