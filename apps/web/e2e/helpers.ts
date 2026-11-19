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

/**
 * EP15D (R-EP15-12): sets the student's day bounds via the real API (200) —
 * the same wake/sleep pair on all seven weekdays. Replaced the retired
 * slot-seeding loops: the planner reads day bounds and schedule blocks, so
 * journeys that need planning time declare it here.
 */
export async function setDayBoundsViaApi(
  request: APIRequestContext,
  accessToken: string,
  bounds: { wakeTime: string; sleepTime: string } = { wakeTime: '08:00', sleepTime: '20:00' }
): Promise<{
  configured: boolean;
  days: { dayOfWeek: number; wakeTime: string; sleepTime: string }[];
}> {
  let response;
  try {
    response = await request.put('/api/schedule/day-bounds', {
      headers: authHeaders(accessToken),
      data: { days: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, ...bounds })) },
    });
  } catch (error) {
    throw describeSetupFailure('/schedule/day-bounds', error);
  }
  requireStatus(response, [200]);
  return (await response.json()) as {
    configured: boolean;
    days: { dayOfWeek: number; wakeTime: string; sleepTime: string }[];
  };
}

/** Log in through the real login UI and wait for an authenticated destination. */
export async function loginViaUi(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  // Login routes new accounts to /onboarding (onboarding incomplete) and
  // onboarded accounts to the `from` path or /today (EP16A).
  await expect(page).toHaveURL(/\/(onboarding|today)/, { timeout: 10_000 });
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

// ---------------------------------------------------------------------------
// EP15J — schedule & calendar helpers (D-J1: seeding through the public API).
// ---------------------------------------------------------------------------

/** Weekday 0…6 (Sunday = 0) of a civil `YYYY-MM-DD`, by UTC arithmetic only. */
export function civilWeekday(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();
}

/**
 * EP17E/EP17H (D-E5, D17-17, AC-E17-10) — the human day label the proposal
 * renders: `"2026-11-19"` → `"Thu, Nov 19"`. Derived here exactly as
 * `src/features/study-plan/lib/dayLabel.ts` derives it (en-US, UTC from the
 * civil date); the e2e project compiles outside the app's path aliases, so
 * the one-line formatter is mirrored rather than imported.
 */
export function dayLabel(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateStr}T00:00:00.000Z`));
}

/** The Monday that starts the week of `dateStr` (Sunday belongs to the previous Monday). */
export function civilMondayOf(dateStr: string): string {
  return addCivilDays(dateStr, -((civilWeekday(dateStr) + 6) % 7));
}

export interface ScheduleBlockRow {
  id: string;
  kind: 'BUSY' | 'STUDY';
  title: string | null;
  courseId: string | null;
  energy: 'HIGH' | 'NORMAL' | 'LOW' | null;
  startDate: string;
  endDate: string | null;
  weekdays: number[] | null;
  startTime: string;
  endTime: string;
}

/** `POST /api/schedule/blocks` (201) — an event (BUSY) or study block (STUDY), one-off or weekly. */
export async function createScheduleBlockViaApi(
  request: APIRequestContext,
  accessToken: string,
  body: {
    kind: 'BUSY' | 'STUDY';
    title?: string;
    courseId?: string;
    energy?: 'HIGH' | 'NORMAL' | 'LOW';
    startDate: string;
    endDate?: string;
    weekdays?: number[];
    startTime: string;
    endTime: string;
  }
): Promise<ScheduleBlockRow> {
  let response;
  try {
    response = await request.post('/api/schedule/blocks', {
      headers: authHeaders(accessToken),
      data: body,
    });
  } catch (error) {
    throw describeSetupFailure('/schedule/blocks', error);
  }
  requireStatus(response, [201]);
  return (await response.json()) as ScheduleBlockRow;
}

export interface CalendarWeek {
  timeZone: string;
  today: string;
  from: string;
  to: string;
  days: {
    date: string;
    wakeTime: string;
    sleepTime: string;
    free: { startTime: string; endTime: string }[];
  }[];
  events: {
    id: string;
    type: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string | null;
    blockId?: string | null;
    recurring?: boolean | null;
    anchor?: 'FIXED' | 'FLEX_DAY' | null;
    assignmentId: string | null;
  }[];
}

/** `GET /api/calendar/events?from&to` — the server-owned read model (EP15D). */
export async function getCalendarWeekViaApi(
  request: APIRequestContext,
  accessToken: string,
  from: string,
  to: string
): Promise<CalendarWeek> {
  const res = await request.get(`/api/calendar/events?from=${from}&to=${to}`, {
    headers: authHeaders(accessToken),
  });
  requireStatus(res, [200]);
  return (await res.json()) as CalendarWeek;
}

/** `HH:mm` → minutes (`24:00` → 1440). */
export const minutesOfTime = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** `[aStart, aEnd)` and `[bStart, bEnd)` share any minute. */
export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  minutesOfTime(aStart) < minutesOfTime(bEnd) && minutesOfTime(bStart) < minutesOfTime(aEnd);

// ---------------------------------------------------------------------------
// EP16F — landing and onboarding helpers.
// ---------------------------------------------------------------------------

/**
 * Marks onboarding complete through the real API (`PATCH /api/onboarding`),
 * so a UI login lands on `/today` instead of the wizard (EP16A, D16-2). Every
 * per-test account starts un-onboarded (EP14C D-C2).
 */
export async function completeOnboardingViaApi(
  request: APIRequestContext,
  accessToken: string
): Promise<void> {
  let response;
  try {
    response = await request.patch('/api/onboarding', {
      headers: authHeaders(accessToken),
      data: { completed: true },
    });
  } catch (error) {
    throw describeSetupFailure('/onboarding', error);
  }
  requireStatus(response, [200]);
}
