import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  addCivilDays,
  authHeaders,
  axeViolations,
  createAssignmentViaApi,
  createAuthenticatedUserViaApi,
  setDayBoundsViaApi,
  getServerWindow,
  loginViaUi,
  savePlanWeekViaApi,
  tabTo,
} from './helpers';

/**
 * EP13M — cross-layer journeys for EP13 Adaptive Scheduling (TR-E13-13) on the
 * self-contained EP09 stack, with the automated half of the combined manual
 * accessibility pass (TR-E13-14, D-M1): axe-core WCAG 2.x A/AA checks and
 * keyboard/focus assertions on every EP13 surface the journeys visit.
 *
 * Date discipline (D-M2, EP13H2's lesson): no fixture reads the wall clock.
 * Every date derives from the server's civil "today" (`GET /api/study-plans`
 * for a plan-less student). Past sessions are seeded through the real save
 * endpoint, which accepts windows from today−6. The one clock control is the
 * *browser's* (`page.clock`) in journey 5, to reach the micro-start target
 * without waiting ten real minutes; the server clock is never touched.
 *
 * Shape (D-M3): one file, serial, a fresh student per journey.
 */

test.describe.configure({ mode: 'serial' });

const uniqueSuffix = () => `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

interface Student {
  email: string;
  accessToken: string;
  today: string;
  to: string;
}

/** A fresh student with availability 08:00–20:00 every day and the server window. */
async function newStudent(request: APIRequestContext): Promise<Student> {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);
  await setDayBoundsViaApi(request, accessToken, { wakeTime: '08:00', sleepTime: '20:00' });
  const win = await getServerWindow(request, accessToken);
  return { email, accessToken, ...win };
}

type PreviewResponse = {
  days: { date: string; sessions: { assignmentId: string; durationMinutes: number }[] }[];
};

async function previewMinutesFor(
  request: APIRequestContext,
  accessToken: string,
  assignmentId: string
): Promise<number> {
  const res = await request.post('/api/study-plans/preview', { headers: authHeaders(accessToken) });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as PreviewResponse;
  return body.days
    .flatMap((d) => d.sessions)
    .filter((s) => s.assignmentId === assignmentId)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}

type TodayResponse = {
  sessions: { id: string; assignmentId: string; status: string; anchor: string }[];
  confirmedMinutesToday: number;
};

async function getToday(request: APIRequestContext, accessToken: string): Promise<TodayResponse> {
  const res = await request.get('/api/study-plans/today', { headers: authHeaders(accessToken) });
  expect(res.status()).toBe(200);
  return (await res.json()) as TodayResponse;
}

/** Finish the open focus session through the real dialog, recording `minutes`. */
async function finishFocusViaUi(page: Page, minutes: number): Promise<void> {
  await page.getByRole('button', { name: 'Finish session' }).click();
  await page.getByLabel('Minutes to record').fill(String(minutes));
  await page.getByRole('button', { name: 'Save time' }).click();
}

/**
 * The axe gate: no serious/critical WCAG A/AA violation on the current page —
 * no exclusions. EP14D removed the two EP13M-era allowances (F-EP13M-04, the
 * success badge contrast, fixed by the `success-strong` text token — D-D2;
 * F-EP13M-05, the calendar chip's label-in-name mismatch, fixed by naming the
 * chip from its visible content — D-D3).
 */
async function expectNoAxeViolations(page: Page, surface: string): Promise<void> {
  const violations = await axeViolations(page);
  expect(violations, `axe on ${surface}:\n${violations.join('\n')}`).toEqual([]);
}

test('journey 1 — do the work and the plan shrinks (AC-E13-01)', async ({ page, request }) => {
  const s = await newStudent(request);
  const essay = await createAssignmentViaApi(request, s.accessToken, {
    title: `Essay ${uniqueSuffix()}`,
    dueDate: `${addCivilDays(s.today, 4)}T12:00:00.000Z`,
    estimatedHours: 3,
  });

  const before = await previewMinutesFor(request, s.accessToken, essay.id);
  expect(before).toBe(180);

  // Real EP07 work: open a session and confirm 60 minutes.
  const open = await request.post('/api/study-sessions', {
    headers: authHeaders(s.accessToken),
    data: { assignmentId: essay.id, plannedMinutes: 60 },
  });
  expect(open.status()).toBe(201);
  const { id } = (await open.json()) as { id: string };
  const finish = await request.post(`/api/study-sessions/${id}/finish`, {
    headers: authHeaders(s.accessToken),
    data: { confirmedMinutes: 60 },
  });
  expect(finish.status()).toBe(200);

  // The regenerated plan places exactly the remaining 120 minutes.
  expect(await previewMinutesFor(request, s.accessToken, essay.id)).toBe(120);

  // …and the plan page shows the shrunken work.
  await loginViaUi(page, s.email);
  await page.goto('/plan');
  // EP16C: one planning action opens the proposal surface.
  await page.getByRole('button', { name: /^(Plan|Replan) my week$/ }).click();
  await expect(page).toHaveURL(/\/plan\/proposal$/);
  await expect(page.getByTestId('plan-week')).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByTestId('plan-session-editor').getByText(essay.title).first()
  ).toBeVisible();
});

test('journey 2 — miss a day and the plan quietly rolls forward (AC-E13-04)', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  const reading = await createAssignmentViaApi(request, s.accessToken, {
    title: `Reading ${uniqueSuffix()}`,
    dueDate: `${addCivilDays(s.today, 4)}T12:00:00.000Z`,
    estimatedHours: 1,
  });
  // A session yesterday that was never started.
  await savePlanWeekViaApi(request, s.accessToken, addCivilDays(s.today, -6), [
    {
      assignmentId: reading.id,
      date: addCivilDays(s.today, -1),
      startTime: '10:00',
      endTime: '11:00',
    },
  ]);

  // The next read reconciles: rolled forward, not missed; the work is still owed.
  await getToday(request, s.accessToken);
  const summaryRes = await request.get('/api/study-plans/recovery-summary', {
    headers: authHeaders(s.accessToken),
  });
  const summary = (await summaryRes.json()) as { missedCount: number; rolledForwardCount: number };
  expect(summary.missedCount).toBe(0);
  expect(summary.rolledForwardCount).toBe(1);
  expect(await previewMinutesFor(request, s.accessToken, reading.id)).toBe(60);

  // No mandatory catch-up: the dashboard opens on today's plan, not a recovery screen.
  await loginViaUi(page, s.email);
  await page.goto('/dashboard');
  // EP16A: the old route redirects to Today.
  await expect(page).toHaveURL(/\/today$/);
  // (The account's "Verify your email" banner is not dashboard content.)
  await expect(page.getByRole('heading', { name: "Today's plan" })).toBeVisible();
  const h2 = (await page.getByRole('heading', { level: 2 }).allTextContents()).filter(
    (t) => t !== 'Verify your email'
  );
  expect(h2[0]).toBe("Today's plan");

  // EP16C: the moved-forward context now lives on the proposal; no count in any h1/h2.
  await page.goto('/plan/proposal');
  await expect(page.getByRole('heading', { name: 'Moved forward into this plan' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(reading.title).first()).toBeVisible();
  for (const heading of await page.getByRole('heading', { level: 1 }).allTextContents()) {
    expect(heading).not.toMatch(/\d/);
  }
  for (const heading of await page.getByRole('heading', { level: 2 }).allTextContents()) {
    expect(heading).not.toMatch(/\d/);
  }
  await expectNoAxeViolations(page, '/plan/proposal');
});

test('journey 3 — one-tap start from the plan, finish completes the planned session (AC-E13-03/05)', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  const lab = await createAssignmentViaApi(request, s.accessToken, {
    title: `Lab ${uniqueSuffix()}`,
    dueDate: `${addCivilDays(s.today, 3)}T12:00:00.000Z`,
    estimatedHours: 1,
  });
  await savePlanWeekViaApi(request, s.accessToken, s.today, [
    { assignmentId: lab.id, date: s.today, startTime: '19:00', endTime: '19:30', anchor: 'FIXED' },
  ]);

  await loginViaUi(page, s.email);
  await page.goto('/dashboard');
  await expect(page.getByText(lab.title).first()).toBeVisible();
  await expectNoAxeViolations(page, '/dashboard');

  // Keyboard one-tap: Tab reaches "Start focus" with a visible ring; Enter starts.
  const walk = await tabTo(page, /^Start focus$/);
  expect(walk.found, `Tab path: ${walk.path.join(' → ')}`).toBe(true);
  const ring = await page.evaluate(
    () => getComputedStyle(document.activeElement as Element).boxShadow
  );
  expect(ring).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/focus/);
  await expect(page.getByText('Focus session running')).toBeAttached();

  await finishFocusViaUi(page, 25);
  await expect(page.getByText('You studied 25 minutes.', { exact: true })).toBeVisible();
  await expectNoAxeViolations(page, '/focus (finished)');

  const today = await getToday(request, s.accessToken);
  const row = today.sessions.find((x) => x.assignmentId === lab.id);
  expect(row?.status).toBe('COMPLETED');
  expect(today.confirmedMinutesToday).toBe(25);
});

test('journey 4 — a flex session is day-anchored: "Anytime", no clock conflicts, startable (AC-E13-09)', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  const flex = await createAssignmentViaApi(request, s.accessToken, {
    title: `Flex ${uniqueSuffix()}`,
    dueDate: `${addCivilDays(s.today, 5)}T12:00:00.000Z`,
    estimatedHours: 1,
  });
  const fixed = await createAssignmentViaApi(request, s.accessToken, {
    title: `Fixed ${uniqueSuffix()}`,
    dueDate: `${addCivilDays(s.today, 5)}T12:00:00.000Z`,
    estimatedHours: 1,
  });
  // The fixed row sits on the flex row's suggested slot: legal, because a flex
  // session has no clock commitment to collide with (EP13G).
  await savePlanWeekViaApi(request, s.accessToken, s.today, [
    {
      assignmentId: flex.id,
      date: s.today,
      startTime: '10:00',
      endTime: '11:00',
      anchor: 'FLEX_DAY',
      windowHint: 'MORNING',
    },
    {
      assignmentId: fixed.id,
      date: s.today,
      startTime: '10:30',
      endTime: '11:30',
      anchor: 'FIXED',
    },
  ]);
  const today = await getToday(request, s.accessToken);
  expect(today.sessions.find((x) => x.assignmentId === flex.id)?.anchor).toBe('FLEX_DAY');

  await loginViaUi(page, s.email);
  await page.goto('/calendar');
  await expect(
    page.getByRole('button', { name: new RegExp(`${flex.title}.*Anytime`) }).first()
  ).toBeVisible();
  await expectNoAxeViolations(page, '/calendar');

  // Start it from the dashboard at whatever time it is — flex sessions sort first.
  await page.goto('/dashboard');
  await expect(page.getByText('Anytime today').first()).toBeVisible();
  await page.getByRole('button', { name: 'Start focus' }).click();
  await expect(page).toHaveURL(/\/focus/);
  const current = await request.get('/api/study-sessions/current', {
    headers: authHeaders(s.accessToken),
  });
  expect(((await current.json()) as { assignmentId: string }).assignmentId).toBe(flex.id);
});

test('journey 5 — micro-start counts, and absorption extends the running target (AC-E13-11)', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  const problemSet = await createAssignmentViaApi(request, s.accessToken, {
    title: `Problems ${uniqueSuffix()}`,
    dueDate: `${addCivilDays(s.today, 3)}T12:00:00.000Z`,
    estimatedHours: 2,
  });
  await savePlanWeekViaApi(request, s.accessToken, s.today, [
    {
      assignmentId: problemSet.id,
      date: s.today,
      startTime: '18:00',
      endTime: '18:30',
      anchor: 'FIXED',
    },
    {
      assignmentId: problemSet.id,
      date: s.today,
      startTime: '19:00',
      endTime: '19:30',
      anchor: 'FIXED',
    },
  ]);

  // Browser clock only (the server clock is never touched).
  await page.clock.install();
  await loginViaUi(page, s.email);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: `Just 10 min of ${problemSet.title}` }).click();
  await expect(page).toHaveURL(/\/focus/);
  const started = (await (
    await request.get('/api/study-sessions/current', { headers: authHeaders(s.accessToken) })
  ).json()) as { id: string; plannedMinutes: number };
  expect(started.plannedMinutes).toBe(10);

  // Reach the 10-minute target while still active → the absorption offer.
  // Fast-forward only once the running timer is on screen — advancing the
  // clock before the session has loaded raced the first tick under load.
  await expect(page.getByLabel(/^Elapsed time /)).toBeVisible();
  await expect(page.getByText('Focus session running')).toBeAttached();
  await page.clock.fastForward('11:00');
  const offer = page.getByTestId('absorb-next-offer');
  await expect(offer).toBeVisible({ timeout: 15_000 });
  await expectNoAxeViolations(page, '/focus (absorption offer)');
  await offer.getByRole('button', { name: /Keep going \(\+30 min\)/ }).click();
  await expect(offer).toHaveCount(0);

  const extended = (await (
    await request.get('/api/study-sessions/current', { headers: authHeaders(s.accessToken) })
  ).json()) as { id: string; plannedMinutes: number };
  expect(extended.id).toBe(started.id);
  expect(extended.plannedMinutes).toBe(40);
  const statuses = (await getToday(request, s.accessToken)).sessions.map((x) => x.status).sort();
  expect(statuses).toEqual(['COMPLETED', 'IN_PROGRESS']);

  // The micro-start's minutes count toward the work.
  await finishFocusViaUi(page, 12);
  await expect(page.getByText('You studied 12 minutes.', { exact: true })).toBeVisible();
  expect(await previewMinutesFor(request, s.accessToken, problemSet.id)).toBe(120 - 12);
});

test('journey 6 — momentum updates after a finish, in minutes and days (AC-E13-12)', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  const quiz = await createAssignmentViaApi(request, s.accessToken, {
    title: `Quiz ${uniqueSuffix()}`,
    dueDate: `${addCivilDays(s.today, 3)}T12:00:00.000Z`,
    estimatedHours: 1,
  });
  await savePlanWeekViaApi(request, s.accessToken, s.today, [
    { assignmentId: quiz.id, date: s.today, startTime: '19:00', endTime: '19:30', anchor: 'FIXED' },
  ]);
  const before = await request.get('/api/study-sessions/momentum', {
    headers: authHeaders(s.accessToken),
  });
  expect(((await before.json()) as { hasHistory: boolean }).hasHistory).toBe(false);

  await loginViaUi(page, s.email);
  // EP16A: the start lives on Today. (The momentum card's empty state is gone;
  // EP16B's momentum row renders nothing before the first session — D16-8.)
  await page.goto('/today');
  await page.getByRole('button', { name: 'Start focus' }).click();
  await expect(page).toHaveURL(/\/focus/);
  await finishFocusViaUi(page, 25);

  // The celebration shows the student's own units once the read resolves.
  const celebration = page.getByTestId('focus-celebration');
  await expect(celebration.getByText('25 of 60 min today')).toBeVisible();
  await expect(celebration.getByText('1 of 3 days this week')).toBeVisible();
  await expect(celebration).not.toContainText('%');

  // Known window (EP16 contracts § Known windows): the dashboard's momentum
  // card is retired by EP16A; Today's momentum row arrives in EP16B and
  // EP16F's today.spec.ts asserts it. Today itself still shows the minutes.
  await page.goto('/today');
  await expect(page.getByText('25 min studied today')).toBeVisible();
  await expectNoAxeViolations(page, '/today');

  const after = (await (
    await request.get('/api/study-sessions/momentum', { headers: authHeaders(s.accessToken) })
  ).json()) as { today: { confirmedMinutes: number }; week: { studyDayCount: number } };
  expect(after.today.confirmedMinutes).toBe(25);
  expect(after.week.studyDayCount).toBe(1);
});

test('journey 7 — information architecture: redirects, nav, nothing count-led (EP13E)', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  const a = await createAssignmentViaApi(request, s.accessToken, {
    title: `IA ${uniqueSuffix()}`,
    dueDate: `${addCivilDays(s.today, 4)}T12:00:00.000Z`,
    estimatedHours: 1,
  });
  await savePlanWeekViaApi(request, s.accessToken, addCivilDays(s.today, -6), [
    { assignmentId: a.id, date: addCivilDays(s.today, -2), startTime: '10:00', endTime: '11:00' },
    { assignmentId: a.id, date: addCivilDays(s.today, -1), startTime: '10:00', endTime: '11:00' },
  ]);

  await loginViaUi(page, s.email);
  await page.goto('/catch-up');
  await expect(page).toHaveURL(/\/plan$/);
  await page.goto('/catch-up/preview');
  await expect(page).toHaveURL(/\/plan\/proposal$/);

  // EP16D: the nav is Today · Plan · Calendar · Work ▾ {Assignments, Courses}.
  await page.goto('/dashboard');
  await expect(page.getByRole('link', { name: 'Plan', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Work menu' }).click();
  await expect(
    page
      .getByRole('menuitem', { name: 'Assignments' })
      .or(page.getByRole('link', { name: 'Assignments' }))
      .first()
  ).toBeVisible();
  await expect(
    page
      .getByRole('menuitem', { name: 'Courses' })
      .or(page.getByRole('link', { name: 'Courses' }))
      .first()
  ).toBeVisible();
  await page.keyboard.press('Escape');

  // No surface leads with a missed/rolled count.
  for (const path of ['/dashboard', '/plan/proposal', '/plan']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    const text = (await page.locator('main').first().textContent()) ?? '';
    expect(text, path).not.toMatch(/\b\d+\s+(missed|rolled|moved)\b/i);
    expect(text, path).not.toMatch(/\d+\s*%\s*(complete|done|on track)/i);
  }

  // The remaining surfaces pass axe too: the calendar (EP15I retired the
  // availability page and redirected its route here) and the preferences
  // form (EP13N/EP13K).
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expectNoAxeViolations(page, '/calendar');
  await page.goto('/profile');
  await expect(page.getByRole('group', { name: 'Your goals' })).toBeVisible();
  await expectNoAxeViolations(page, '/profile (preferences)');
});
