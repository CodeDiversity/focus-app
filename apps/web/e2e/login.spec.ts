import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Smoke test: the full auth stack works end to end.
 *
 * Registers a fresh user through the real API, then logs in through the real
 * login UI and asserts an authenticated destination renders. A missing or
 * broken API/DB surfaces here as a failed registration, not a silent pass.
 */

/**
 * EP14C (D-C2, F-EP13M-06): a fresh user per TEST, never per file. Under
 * `fullyParallel`, one worker can run a file's `beforeAll` more than once
 * while reusing the module-level user, so a shared registration 409'd on its
 * second run. Registering inside each test makes the collision impossible.
 */
const PASSWORD = 'E2eSmokePassword123!';

async function registerFreshUser(request: APIRequestContext): Promise<{ email: string }> {
  const email = `e2e-smoke-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.com`;
  let response;
  try {
    response = await request.post('/api/auth/register', {
      data: { name: 'E2E Smoke User', email, password: PASSWORD },
    });
  } catch (error) {
    // Connection-level failure: say what to do (SP-119, D119-5 mode-conditional tail).
    const remedy = process.env.E2E_BASE_URL
      ? `The externally provided stack at ${process.env.E2E_BASE_URL} must be running — start it, then re-run the tests.`
      : 'The self-contained test stack is started automatically — ensure Postgres is running, then re-run `pnpm test:e2e`.';
    throw new Error(
      `Could not reach the API at ${process.env.E2E_BASE_URL ?? 'http://localhost:3100'}/api ` +
        `(${(error as Error).message}). ${remedy}`
    );
  }
  // The email is unique per test, so anything other than 201 is a real
  // problem — surface the body instead of a timeout cascade.
  if (response.status() !== 201) {
    const body = (await response.text().catch(() => '')).slice(0, 200);
    const remedy = process.env.E2E_BASE_URL
      ? `The externally provided stack at ${process.env.E2E_BASE_URL} must be running and able to reach its database.`
      : 'The API must be running and able to reach its database — ensure Postgres is running, then re-run `pnpm test:e2e`.';
    throw new Error(
      `Test user registration failed with status ${response.status()}${body ? ` — ${body}` : ''}. ${remedy}`
    );
  }
  return { email };
}

test('login with valid credentials reaches an authenticated page', async ({ page, request }) => {
  const user = await registerFreshUser(request);
  await page.goto('/login');

  await page.getByLabel('Email').fill(user.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Login lands on onboarding for new accounts (or dashboard once onboarded).
  await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 10_000 });
});

test('login with a wrong password shows an error and stays on /login', async ({
  page,
  request,
}) => {
  const user = await registerFreshUser(request);
  await page.goto('/login');

  await page.getByLabel('Email').fill(user.email);
  await page.getByRole('textbox', { name: 'Password' }).fill('WrongPassword123!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // The API's uniform 401 message is surfaced as an error toast (LoginPage
  // catch → toast.error); the user must not be navigated away from /login.
  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
