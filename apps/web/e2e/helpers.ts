import { createRequire } from 'node:module';
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

/** Creates an assignment via the real API (201) and returns the created row. */
export async function createAssignmentViaApi(
  request: APIRequestContext,
  accessToken: string,
  data: {
    title: string;
    courseId?: string | null;
    dueDate?: string | null;
    estimatedHours?: number | null;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | null;
    type?: 'HOMEWORK' | 'PAPER' | 'PROJECT' | 'QUIZ' | 'EXAM' | null;
    description?: string | null;
  }
): Promise<{ id: string; title: string }> {
  let response;
  try {
    response = await request.post('/api/assignments', {
      headers: authHeaders(accessToken),
      data,
    });
  } catch (error) {
    throw describeSetupFailure('/assignments', error);
  }
  requireStatus(response, [201]);
  return (await response.json()) as { id: string; title: string };
}

/** Creates an availability slot via the real API (201) and returns the created row. */
export async function createAvailabilitySlotViaApi(
  request: APIRequestContext,
  accessToken: string,
  data: { dayOfWeek: number; startTime: string; endTime: string; isAvailable?: boolean }
): Promise<{
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}> {
  let response;
  try {
    response = await request.post('/api/availability-slots', {
      headers: authHeaders(accessToken),
      data,
    });
  } catch (error) {
    throw describeSetupFailure('/availability-slots', error);
  }
  requireStatus(response, [201]);
  return (await response.json()) as {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  };
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

// ---------------------------------------------------------------------------
// EP13M — shared helpers for the adaptive-scheduling journeys (D-M3).
// ---------------------------------------------------------------------------

/** Civil-date arithmetic on server-returned `YYYY-MM-DD` strings only (never the wall clock). */
export function addCivilDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * The server's planning window for a plan-less student: `from` is the server
 * civil "today" (D-M2 — the only "today" a journey may use; EP13H2 lesson).
 */
export async function getServerWindow(
  request: APIRequestContext,
  accessToken: string
): Promise<{ today: string; to: string }> {
  const res = await request.get('/api/study-plans', { headers: authHeaders(accessToken) });
  requireStatus(res, [200]);
  const win = (await res.json()) as { from: string; to: string };
  return { today: win.from, to: win.to };
}

/** One row of `POST /api/study-plans`. */
export interface PlanSeedSession {
  assignmentId: string;
  date: string;
  startTime: string;
  endTime: string;
  anchor?: 'FIXED' | 'FLEX_DAY';
  windowHint?: 'MORNING' | 'AFTERNOON' | 'EVENING';
}

/** Save a seven-day plan week starting at `from` (accepted from today−6, D06-23). */
export async function savePlanWeekViaApi(
  request: APIRequestContext,
  accessToken: string,
  from: string,
  sessions: PlanSeedSession[]
): Promise<{ days: { date: string; sessions: { id: string; assignmentId: string }[] }[] }> {
  const res = await request.post('/api/study-plans', {
    headers: authHeaders(accessToken),
    data: { from, to: addCivilDays(from, 6), sessions },
  });
  requireStatus(res, [201]);
  return (await res.json()) as {
    days: { date: string; sessions: { id: string; assignmentId: string }[] }[];
  };
}

/**
 * Run axe-core (the copy already installed with eslint-plugin-jsx-a11y — no
 * new dependency) against the current page for WCAG 2.x A/AA rules and return
 * the violations at `serious`/`critical` impact, as compact strings.
 */
export async function axeViolations(
  page: Page,
  options: { ignore?: (ruleId: string, html: string) => boolean } = {}
): Promise<string[]> {
  const fromPlugin = createRequire(require.resolve('eslint-plugin-jsx-a11y/package.json'));
  // Scan the settled page: an entrance animation mid-fade would read as low
  // contrast (opacity < 1) — a sampling artefact, not a defect.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState === 'finished' || a.playState === 'idle')
  );
  await page.addScriptTag({ path: fromPlugin.resolve('axe-core/axe.min.js') });
  const results = await page.evaluate(async () => {
    const axe = (
      window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<unknown> } }
    ).axe;
    return (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    })) as {
      violations: {
        id: string;
        impact: string | null;
        nodes: { target: string[]; html: string }[];
      }[];
    };
  });
  const ignore = options.ignore ?? (() => false);
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ ...v, nodes: v.nodes.filter((n) => !ignore(v.id, n.html)) }))
    .filter((v) => v.nodes.length > 0)
    .map(
      (v) =>
        `${v.id} (${v.impact}) × ${v.nodes.length}: ${v.nodes
          .map((n) => n.target.join(' '))
          .slice(0, 3)
          .join(' | ')}`
    );
}

/**
 * Walk the real Tab order until the focused element's accessible text matches
 * `label`; returns the visited path so a failure names where focus stalled.
 */
export async function tabTo(
  page: Page,
  label: RegExp,
  max = 60
): Promise<{ found: boolean; path: string[] }> {
  const path: string[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const text = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? (el.getAttribute('aria-label') ?? el.textContent ?? '').trim() : '';
    });
    path.push(text.slice(0, 48));
    if (new RegExp(label.source, label.flags).test(text)) return { found: true, path };
  }
  return { found: false, path };
}
