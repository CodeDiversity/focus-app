import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Auth journey coverage (SP-117): registration, session persistence across
 * reload, logout, and the protected-route redirect — all against the real
 * API/database via the self-contained test stack (SP-119; or an external one
 * when E2E_BASE_URL is set). Complements the SP-116 login smoke test in
 * `login.spec.ts`.
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
    // Mode-conditional tail (SP-119, D119-5): self-contained (default) mode
    // → "ensure Postgres is running" (the test stack starts automatically);
    // E2E_BASE_URL external-stack mode → keep the SP-116 AC2 semantics.
    const remedy = process.env.E2E_BASE_URL
      ? `The externally provided stack at ${process.env.E2E_BASE_URL} must be running — start it, then re-run the tests.`
      : 'The self-contained test stack is started automatically — ensure Postgres is running, then re-run `pnpm test:e2e`.';
    throw new Error(
      `Could not reach the API at ${process.env.E2E_BASE_URL ?? 'http://localhost:3100'}/api ` +
        `(${(error as Error).message}). ${remedy}`
    );
  }
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
}

/** Log in through the real login UI and wait for an authenticated destination. */
/**
 * EP14C (D-C3, F-EP13M-06): wait for the post-login page to settle before
 * touching the account menu. Diagnosed from reproduced traces under 8-worker
 * load: (1) the menu was clicked ~270 ms after "Sign In" while the login
 * redirect chain was still running; (2) even after the page heading rendered,
 * the menu could still be unmounted by a late re-render in the first second
 * after login (F-EP14C-02, product follow-up BL-14-07 — not fixed here; this
 * story is test-only).
 */
async function waitForSettledShell(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
}

/** Open the account menu (re-opening if a late re-render closed it) until "Logout" is visible. */
async function openAccountMenu(page: Page): Promise<void> {
  await waitForSettledShell(page);
  const logout = page.getByRole('menuitem', { name: 'Logout' });
  await expect(async () => {
    if (!(await logout.isVisible())) {
      await page.getByRole('button', { name: /open account menu/i }).click({ timeout: 2_000 });
    }
    await expect(logout).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
}

/**
 * Log out through the real menu. Open + click + "reached /login" is one
 * retried unit, so a menu unmounted between opening and clicking (F-EP14C-02)
 * is retried instead of timing out; each attempt checks the URL first, so a
 * slow-but-successful logout is never misread as a failure.
 */
async function logoutViaMenu(page: Page): Promise<void> {
  await waitForSettledShell(page);
  const logout = page.getByRole('menuitem', { name: 'Logout' });
  await expect(async () => {
    if (/\/login/.test(page.url())) return;
    if (!(await logout.isVisible())) {
      await page.getByRole('button', { name: /open account menu/i }).click({ timeout: 2_000 });
    }
    await logout.click({ timeout: 2_000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  }).toPass({ timeout: 25_000 });
}

async function loginViaUi(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
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
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Create Account' }).click();

  // The product's deliberate register flow (SP-102): no auto-login — a
  // success toast confirms the account and the user is redirected to /login
  // to authenticate.
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  await expect(page.getByText('Account created successfully!')).toBeVisible();

  // The just-registered credentials now work: logging in through the real UI
  // reaches the authenticated app.
  await loginViaUi(page, email);
  await openAccountMenu(page);
});

test('a logged-in session survives a page reload', async ({ page, request }) => {
  const email = uniqueEmail();
  await registerUserViaApi(request, email);
  await loginViaUi(page, email);

  // Boot restore re-establishes the user from the httpOnly session cookie;
  // the protected route must not bounce back to /login.
  await page.reload();
  await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 10_000 });
  await page.getByRole('button', { name: /open account menu/i }).click();
  await expect(page.getByRole('menuitem', { name: 'Logout' })).toBeVisible();
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
  await logoutViaMenu(page);

  // The protected route must not render while logged out.
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});

test('visiting a protected route while logged out redirects to /login', async ({ page }) => {
  // Fresh context: no session cookie exists, so boot restore finds no user
  // and ProtectedRoute redirects instead of rendering the dashboard.
  //
  // EP14C (F-EP14C-01): the redirect fires only after the boot-time
  // /api/auth/refresh answers. On a cold, fully parallel stack that answer
  // took longer than this test's fixed budget (seen once in three full runs),
  // so the test waits on the real event — the refresh response — instead of a
  // clock, and says so if it never comes. The behavior under test is "it
  // redirects", not how fast a cold stack boots, hence the per-test budget.
  test.setTimeout(60_000);
  const refreshAnswered = page.waitForResponse((r) => r.url().includes('/api/auth/refresh'), {
    timeout: 45_000,
  });
  await page.goto('/dashboard');
  await refreshAnswered.catch(() => {
    throw new Error(
      'Boot-time /api/auth/refresh never answered — the API stalled, not the redirect.'
    );
  });
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});

test('login with an unknown email shows the uniform error and stays on /login', async ({
  page,
}) => {
  // Extends SP-116's wrong-password case with the unknown-user path: the API
  // must return the same uniform 401 message (no account-existence oracle).
  await page.goto('/login');
  await page.getByLabel('Email').fill(uniqueEmail());
  await page.getByRole('textbox', { name: 'Password' }).fill('UnknownUser123!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
