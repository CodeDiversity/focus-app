import { expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Shared E2E helpers (SP-118): user registration/login against the real API
 * plus authenticated API setup calls, so tests that mutate data only through
 * the UI can still start from known, independent entities.
 *
 * The per-test `request` fixture is used for API calls — it is isolated per
 * test, matching the suite's data-isolation rule. Authenticated setup calls
 * carry the bearer token returned by `POST /api/auth/login` (the guard only
 * accepts `Authorization` headers; the httpOnly cookie is the refresh token,
 * `jwt.strategy.ts`). Tokens live in local test variables only.
 *
 * Login through the real UI (`loginViaUi`) is what establishes the browser's
 * session cookie when a test drives pages.
 */

/** Test fixture password (min 8 chars per the auth schemas) — not a secret. */
export const PASSWORD = 'E2eAuthPassword123!';

/** Unique per run AND per worker (email uniqueness is global; the SP-116 F6 lesson). */
export const uniqueEmail = () =>
  `e2e-auth-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.com`;

/**
 * Fail-fast wrapper message shared by every API setup call. The tail is
 * mode-conditional (SP-119, D119-5): self-contained (default) mode → "ensure
 * Postgres is running" (the test stack starts automatically); `E2E_BASE_URL`
 * external-stack mode → keep the SP-116 AC2 semantics (the externally
 * provided stack must be running).
 */
function describeSetupFailure(endpoint: string, error: unknown): Error {
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
  const remedy = process.env.E2E_BASE_URL
    ? `The externally provided stack at ${process.env.E2E_BASE_URL} must be running — start it, then re-run the tests.`
    : 'The self-contained test stack is started automatically — ensure Postgres is running, then re-run `pnpm test:e2e`.';
  return new Error(
    `Could not reach the API at ${baseUrl}/api ` +
      `(${(error as Error).message}) while calling ${endpoint}. ` +
      `${remedy}`
  );
}

function requireStatus(response: { status(): number; url(): string }, expected: number[]): void {
  if (!expected.includes(response.status())) {
    throw new Error(
      `Setup API call to ${response.url()} returned ${response.status()}, expected ${expected.join('/')}.`
    );
  }
}

/** Registers a throwaway user through the real API (201 required). */
export async function registerUserViaApi(request: APIRequestContext, email: string): Promise<void> {
  let response;
  try {
    response = await request.post('/api/auth/register', {
      data: { name: 'E2E Auth User', email, password: PASSWORD },
    });
  } catch (error) {
    throw describeSetupFailure('/auth/register', error);
  }
  requireStatus(response, [201]);
}

/** Logs in via the API and returns the access token for authenticated setup calls. */
async function loginViaApi(request: APIRequestContext, email: string): Promise<string> {
  let response;
  try {
    response = await request.post('/api/auth/login', {
      data: { email, password: PASSWORD },
    });
  } catch (error) {
    throw describeSetupFailure('/auth/login', error);
  }
  requireStatus(response, [200]);
  const body = (await response.json()) as { accessToken?: string };
  if (!body.accessToken) {
    throw new Error('Login response did not contain an accessToken.');
  }
  return body.accessToken;
}

/**
 * Registers and logs in a fresh user via the API; returns the email (for a
 * UI login) and the access token (for authenticated API setup calls).
 */
export async function createAuthenticatedUserViaApi(
  request: APIRequestContext
): Promise<{ email: string; accessToken: string }> {
  const email = uniqueEmail();
  await registerUserViaApi(request, email);
  const accessToken = await loginViaApi(request, email);
  return { email, accessToken };
}

/** Authorization headers for authenticated API setup calls. */
export const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

/** Creates a semester via the real API (201) and returns the created row. */
export async function createSemesterViaApi(
  request: APIRequestContext,
  accessToken: string,
  data: { name: string; startDate: string; endDate: string }
): Promise<{ id: string; name: string; startDate: string; endDate: string }> {
  let response;
  try {
    response = await request.post('/api/semesters', {
      headers: authHeaders(accessToken),
      data,
    });
  } catch (error) {
    throw describeSetupFailure('/semesters', error);
  }
  requireStatus(response, [201]);
  return (await response.json()) as {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
}

/** Creates a course via the real API (201) and returns the created row. */
export async function createCourseViaApi(
  request: APIRequestContext,
  accessToken: string,
  data: { code: string; name: string; semesterId?: string; instructor?: string; credits?: number }
): Promise<{ id: string; code: string; name: string }> {
  let response;
  try {
    response = await request.post('/api/courses', {
      headers: authHeaders(accessToken),
      data,
    });
  } catch (error) {
    throw describeSetupFailure('/courses', error);
  }
  requireStatus(response, [201]);
  return (await response.json()) as { id: string; code: string; name: string };
}

/** Log in through the real login UI and wait for an authenticated destination. */
export async function loginViaUi(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  // Login routes new accounts to /onboarding (onboarding incomplete) and
  // onboarded accounts to the `from` path or /dashboard.
  await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 10_000 });
}
