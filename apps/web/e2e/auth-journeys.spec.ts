import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Auth journey coverage (SP-117): registration, session persistence across
 * reload, logout, and the protected-route redirect — all against the real
 * API/database via the running dev stack. Complements the SP-116 login smoke
 * test in `login.spec.ts`.
 *
 * Every test is independent and brings its own data: a per-test unique email
 * (timestamp + random suffix, the SP-116 F6 lesson) so tests never share or
 * collide, with or without worker parallelism.
 */

// Test fixture password (min 8 chars per the register/login schemas) — not a
// secret; every run creates throwaway accounts.
const PASSWORD = 'E2eAuthPassword123!';

const uniqueEmail = () => `e2e-auth-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.com`;

/**
 * Register a throwaway user through the real API (same approach as the
 * SP-116 smoke test) so login/logout/reload journeys start from a known
 * account instead of depending on seed data. Connection failures and
 * non-201 responses fail fast with an actionable message.
 */
async function registerUserViaApi(request: APIRequestContext, email: string): Promise<void> {
  let response;
  try {
    response = await request.post('/api/auth/register', {
      data: { name: 'E2E Auth User', email, password: PASSWORD },
    });
  } catch (error) {
    throw new Error(
      `Could not reach the API at ${process.env.E2E_BASE_URL ?? 'http://localhost:3000'}/api ` +
        `(${(error as Error).message}). Start the dev stack with \`pnpm dev\` before running E2E tests.`
    );
  }
  if (response.status() !== 201) {
    const body = (await response.text().catch(() => '')).slice(0, 200);
    throw new Error(
      `Test user registration failed with status ${response.status()}${body ? ` — ${body}` : ''}. ` +
        `The API must be running and able to reach its database (start the dev stack with \`pnpm dev\`).`
    );
  }
}

/** Log in through the real login UI and wait for an authenticated destination. */
async function loginViaUi(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  // Login routes new accounts to /onboarding (onboarding incomplete) and
  // onboarded accounts to the `from` path or /dashboard.
  await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 10_000 });
}

test('registering a new account through the UI leads to an authenticated session', async ({
  page,
}) => {
  const email = uniqueEmail();

  await page.goto('/register');
  await page.getByLabel('Display Name').fill('E2E Register User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create Account' }).click();

  // The product's deliberate register flow (SP-102): no auto-login — a
  // success toast confirms the account and the user is redirected to /login
  // to authenticate.
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  await expect(page.getByText('Account created successfully!')).toBeVisible();

  // The just-registered credentials now work: logging in through the real UI
  // reaches the authenticated app.
  await loginViaUi(page, email);
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
});

test('a logged-in session survives a page reload', async ({ page, request }) => {
  const email = uniqueEmail();
  await registerUserViaApi(request, email);
  await loginViaUi(page, email);

  // Boot restore re-establishes the user from the httpOnly session cookie;
  // the protected route must not bounce back to /login.
  await page.reload();
  await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
});

test('logout returns to /login and the protected route then redirects there', async ({
  page,
  request,
}) => {
  const email = uniqueEmail();
  await registerUserViaApi(request, email);
  await loginViaUi(page, email);

  // Logout clears the session; because we are on a protected route,
  // ProtectedRoute immediately navigates to /login.
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

  // The protected route must not render while logged out.
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});

test('visiting a protected route while logged out redirects to /login', async ({ page }) => {
  // Fresh context: no session cookie exists, so boot restore finds no user
  // and ProtectedRoute redirects instead of rendering the dashboard.
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});

test('login with an unknown email shows the uniform error and stays on /login', async ({
  page,
}) => {
  // Extends SP-116's wrong-password case with the unknown-user path: the API
  // must return the same uniform 401 message (no account-existence oracle).
  await page.goto('/login');
  await page.getByLabel('Email').fill(uniqueEmail());
  await page.getByLabel('Password').fill('UnknownUser123!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
