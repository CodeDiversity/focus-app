import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  addCivilDays,
  authHeaders,
  axeViolations,
  completeOnboardingViaApi,
  createAssignmentViaApi,
  createAuthenticatedUserViaApi,
  dayLabel,
  getServerWindow,
  loginViaUi,
  setDayBoundsViaApi,
} from './helpers';

/**
 * EP17H (TR-E17-06) — the EP17 journeys over the real stack: the pacing
 * levers a student sets in the browser reach the pure scheduler three layers
 * down and come back as a different week.
 *
 * Date discipline as EP13M (D-M2): every fixture date derives from the
 * server's civil "today"; the wall clock is never read. One fresh, onboarded
 * student per journey.
 *
 * ▲ D-H1 (a): the spread is asserted by **shape** — minutes on more than the
 * first two days, and on no day outside the §4 selection — from a fixture
 * with **no critical (rule 3) work**, because the critical pass may
 * legitimately place outside the selection (contracts §4; R-EP17-05). The
 * exact arithmetic belongs to the domain spec, not to a browser test.
 */

test.describe.configure({ mode: 'serial' });

const uniqueSuffix = () => `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

interface Student {
  email: string;
  accessToken: string;
  today: string;
  to: string;
}

interface Pacing {
  spreadPercent: number;
  studyDays: string[];
  perDayMinutes: Record<string, number>;
}

interface PreviewResponse {
  from: string;
  to: string;
  pacing: Pacing;
  days: { date: string; sessions: { assignmentId: string; assignmentTitle: string }[] }[];
}

/** Fresh, onboarded student with generous day bounds and the server window. */
async function newStudent(request: APIRequestContext): Promise<Student> {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);
  await setDayBoundsViaApi(request, accessToken, { wakeTime: '07:00', sleepTime: '22:00' });
  await completeOnboardingViaApi(request, accessToken);
  const win = await getServerWindow(request, accessToken);
  return { email, accessToken, ...win };
}

/** Writes spread levers through the same `@CurrentUser()`-scoped route the UI uses. */
async function setPacingPreferencesViaApi(
  request: APIRequestContext,
  accessToken: string,
  body: { spreadPercent?: number; weeklyGoalDays?: number }
): Promise<void> {
  const response = await request.put('/api/study-preferences', {
    headers: authHeaders(accessToken),
    data: body,
  });
  expect(response.status(), await response.text()).toBe(200);
}

/** The proposal's preview response, captured as the page loads it. */
function waitForPreviewResponse(page: Page) {
  return page.waitForResponse(
    (r) => r.url().includes('/api/study-plans/catch-up/preview') && r.status() === 200,
    { timeout: 20_000 }
  );
}

/** The axe gate: no serious/critical WCAG A/AA violation, no allowlist. */
async function expectNoAxeViolations(page: Page, surface: string): Promise<void> {
  const violations = await axeViolations(page);
  expect(violations, `axe on ${surface}:\n${violations.join('\n')}`).toEqual([]);
}

/** Dates that actually carry minutes, in date order. */
function datesWithWork(pacing: Pacing): string[] {
  return Object.entries(pacing.perDayMinutes)
    .filter(([, minutes]) => minutes > 0)
    .map(([date]) => date)
    .sort();
}

test('EP17H-AC1: a paced week is spread over the chosen study days, edited in place, confirmed, and reaches Today', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  // Explicitly chosen levers (▲ D17-16: only an explicit number narrows the
  // plan) — three study days, evenly spread.
  await setPacingPreferencesViaApi(request, s.accessToken, {
    weeklyGoalDays: 3,
    spreadPercent: 100,
  });

  // No critical work (D-H1/R-EP17-05): one assignment with a whole week of
  // slack, so every placement comes from the normal rotation.
  const essay = await createAssignmentViaApi(request, s.accessToken, {
    title: `Pacing essay ${uniqueSuffix()}`,
    dueDate: `${s.to}T23:00:00.000Z`,
    estimatedHours: 6,
    priority: 'MEDIUM',
  });

  await loginViaUi(page, s.email);
  const [previewRes] = await Promise.all([
    waitForPreviewResponse(page),
    page.goto('/plan/proposal'),
  ]);
  const preview = (await previewRes.json()) as PreviewResponse;
  await expect(page.getByTestId('editable-week')).toBeVisible({ timeout: 15_000 });

  // (a) The levers reached the engine: at most three selected days…
  expect(preview.pacing.spreadPercent).toBe(100);
  expect(preview.pacing.studyDays.length).toBeLessThanOrEqual(3);
  // …the work is not packed into the first two days…
  const worked = datesWithWork(preview.pacing);
  expect(worked.length).toBeGreaterThan(2);
  // …and nothing landed outside the selection (no critical pass in this fixture).
  for (const date of worked) {
    expect(preview.pacing.studyDays, `${date} is outside the selected study days`).toContain(date);
  }

  // (b) Human day labels, never an ISO date (AC-E17-10, V-17-4).
  const week = page.getByTestId('editable-week');
  await expect(
    week.getByText(dayLabel(preview.pacing.studyDays[0]), { exact: false }).first()
  ).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/\d{4}-\d{2}-\d{2}/);

  // (c) Edit one session in place: move the *last* placed session to a day
  // that carries no work yet, so today's session (the one Today will show)
  // is untouched and nothing can overlap.
  const lastWorkedDate = worked[worked.length - 1];
  const freeDate = (() => {
    for (let i = 0; i <= 6; i += 1) {
      const candidate = addCivilDays(s.today, i);
      if (candidate <= s.to && !worked.includes(candidate)) return candidate;
    }
    return null;
  })();
  expect(freeDate, 'the window has a day with no placed work').toBeTruthy();

  const lastCard = week.locator('article').last();
  await lastCard.locator('button').first().click();
  const panel = page.getByTestId('session-editor-panel');
  await expect(panel).toBeVisible();
  expect(await panel.getByLabel('Day').inputValue()).toBe(lastWorkedDate);
  await panel.getByLabel('Day').selectOption(freeDate as string);
  await expect(panel.getByLabel('Day')).toHaveValue(freeDate as string);

  // (d) Confirm, and Today shows the resulting next session.
  await page.getByRole('button', { name: 'Use this plan' }).click();
  await expect(page.getByText('Plan saved.')).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/today$/);

  const todayRes = await request.get('/api/study-plans/today', {
    headers: authHeaders(s.accessToken),
  });
  const today = (await todayRes.json()) as { sessions: { assignmentId: string }[] };
  expect(today.sessions.map((x) => x.assignmentId)).toContain(essay.id);
  await expect(page.getByText('Next up')).toBeVisible();
  await expect(page.locator('main').getByText(essay.title).first()).toBeVisible();

  // (e) The student's in-place edit is what was saved.
  const savedRes = await request.get(`/api/study-plans?from=${preview.from}&to=${preview.to}`, {
    headers: authHeaders(s.accessToken),
  });
  const saved = (await savedRes.json()) as { days: { date: string; sessions: unknown[] }[] };
  const savedDates = saved.days.filter((d) => d.sessions.length > 0).map((d) => d.date);
  expect(savedDates).toContain(freeDate);
});

test('EP17H-AC2: changing the spread preset on the proposal re-plans the week, and Profile shows the saved choice (▲ D-H2 (a))', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  // Start from the un-paced end of the lever so the change is observable.
  await setPacingPreferencesViaApi(request, s.accessToken, {
    weeklyGoalDays: 5,
    spreadPercent: 0,
  });
  await createAssignmentViaApi(request, s.accessToken, {
    title: `Preset project ${uniqueSuffix()}`,
    dueDate: `${s.to}T23:00:00.000Z`,
    estimatedHours: 8,
    priority: 'MEDIUM',
  });

  await loginViaUi(page, s.email);
  const [firstRes] = await Promise.all([waitForPreviewResponse(page), page.goto('/plan/proposal')]);
  const before = (await firstRes.json()) as PreviewResponse;
  await expect(page.getByTestId('editable-week')).toBeVisible({ timeout: 15_000 });
  expect(before.pacing.spreadPercent).toBe(0);
  const daysBefore = datesWithWork(before.pacing).length;

  // The controls live behind one "Change the pace" disclosure (D-G3/D-G8),
  // open at md+ and collapsed below it.
  const pace = page.getByRole('button', { name: 'Change the pace' });
  if ((await pace.getAttribute('aria-expanded')) === 'false') await pace.click();
  await expect(page.getByTestId('pacing-controls')).toBeVisible();

  // Choosing a preset writes the one key and rebuilds the week in place.
  const [replanRes] = await Promise.all([
    waitForPreviewResponse(page),
    page.getByRole('radio', { name: /Evenly spread/ }).click(),
  ]);
  const after = (await replanRes.json()) as PreviewResponse;
  expect(after.pacing.spreadPercent).toBe(100);
  // The week really changed shape: evenly spread uses at least as many days,
  // and the engine was asked again (the response above is the proof).
  expect(datesWithWork(after.pacing).length).toBeGreaterThanOrEqual(daysBefore);
  await expect(page.getByTestId('pacing-controls').getByRole('status')).toContainText(
    'New week ready',
    { timeout: 20_000 }
  );
  await expect(page.getByTestId('pacing-error')).toHaveCount(0);
  await expect(page.getByTestId('editable-week')).toBeVisible();

  // Confirm, then check the saved value where a student would check it.
  await page.getByRole('button', { name: 'Use this plan' }).click();
  await expect(page.getByText('Plan saved.')).toBeVisible({ timeout: 20_000 });

  await page.goto('/profile');
  await expect(page.getByRole('radio', { name: /Evenly spread/ })).toBeChecked({ timeout: 15_000 });
  const prefsRes = await request.get('/api/study-preferences', {
    headers: authHeaders(s.accessToken),
  });
  expect(((await prefsRes.json()) as { spreadPercent: number }).spreadPercent).toBe(100);
});

test('EP17H-AC4: the axe gate passes on the rebuilt proposal at 1280px and 360px, controls open', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  await setPacingPreferencesViaApi(request, s.accessToken, {
    weeklyGoalDays: 3,
    spreadPercent: 100,
  });
  await createAssignmentViaApi(request, s.accessToken, {
    title: `Axe assignment ${uniqueSuffix()}`,
    dueDate: `${s.to}T23:00:00.000Z`,
    estimatedHours: 5,
    priority: 'MEDIUM',
  });

  await loginViaUi(page, s.email);
  await Promise.all([waitForPreviewResponse(page), page.goto('/plan/proposal')]);
  await expect(page.getByTestId('editable-week')).toBeVisible({ timeout: 15_000 });

  for (const [width, height] of [
    [1280, 800],
    [360, 640],
  ] as const) {
    await page.setViewportSize({ width, height });
    const pace = page.getByRole('button', { name: 'Change the pace' });
    if ((await pace.getAttribute('aria-expanded')) === 'false') await pace.click();
    await expect(page.getByTestId('pacing-controls')).toBeVisible();
    const disclosure = page.getByRole('button', { name: 'What else changed' });
    if (
      (await disclosure.count()) > 0 &&
      (await disclosure.getAttribute('aria-expanded')) === 'false'
    ) {
      await disclosure.click();
    }
    await expectNoAxeViolations(page, `/plan/proposal @${width}px (EP17 rebuild)`);
  }
});
