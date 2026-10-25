import { test, expect } from '@playwright/test';

/**
 * Smoke test: the full auth stack works end to end.
 *
 * Registers a fresh user through the real API, then logs in through the real
 * login UI and asserts an authenticated destination renders. A missing or
 * broken API/DB surfaces here as a failed login, not a silent pass.
 */

// Unique per run so repeated runs never collide with an existing account.
const testUser = {
  name: 'E2E Smoke User',
  email: `e2e-smoke-${Date.now()}@example.com`,
  password: 'E2eSmokePassword123!',
};

test.beforeAll(async ({ request }) => {
  const response = await request.post('/api/auth/register', {
    data: { name: testUser.name, email: testUser.email, password: testUser.password },
  });

  // 409 is acceptable in principle (user already exists), but emails are
  // timestamp-unique, so anything other than 201 means the API or DB is down.
  if (response.status() !== 201) {
    throw new Error(
      `Test user registration failed with status ${response.status()} — ` +
        `the API must be running (pnpm dev) before E2E tests can run.`
    );
  }
});

test('login with valid credentials reaches an authenticated page', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill(testUser.email);
  await page.getByLabel('Password').fill(testUser.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Login lands on onboarding for new accounts (or dashboard once onboarded).
  await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 10_000 });
});
