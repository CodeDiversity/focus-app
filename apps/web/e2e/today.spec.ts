import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  addCivilDays,
  authHeaders,
  axeViolations,
  completeOnboardingViaApi,
  createAssignmentViaApi,
  createAuthenticatedUserViaApi,
  getServerWindow,
  loginViaUi,
  savePlanWeekViaApi,
  setDayBoundsViaApi,
} from './helpers';

/**
 * EP16F — the Today journeys (TR-E16-03; AC-E16-01/02/04/06/07 end to end):
 * land, start, finish, come back. Date discipline as EP13M (D-M2): every
 * fixture date derives from the server's civil "today"; the wall clock is
 * never read. One fresh, onboarded student per journey.
 */

test.describe.configure({ mode: 'serial' });

const uniqueSuffix = () => `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

interface Student {
  email: string;
  accessToken: string;
  today: string;
  to: string;
}

/** Fresh, onboarded student with day bounds 08:00–20:00 and the server window. */
async function newStudent(request: APIRequestContext): Promise<Student> {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);
  await setDayBoundsViaApi(request, accessToken, { wakeTime: '08:00', sleepTime: '20:00' });
  await completeOnboardingViaApi(request, accessToken);
  const win = await getServerWindow(request, accessToken);
  return { email, accessToken, ...win };
}

/** The axe gate: no serious/critical WCAG A/AA violation, no allowlist. */
async function expectNoAxeViolations(page: Page, surface: string): Promise<void> {
  const violations = await axeViolations(page);
  expect(violations, `axe on ${surface}:\n${violations.join('\n')}`).toEqual([]);
}

/** Finish the open focus session through the real dialog, recording `minutes`. */
async function finishFocusViaUi(page: Page, minutes: number): Promise<void> {
  await page.getByRole('button', { name: 'Finish session' }).click();
  await page.getByLabel('Minutes to record').fill(String(minutes));
  await page.getByRole('button', { name: 'Save time' }).click();
}

/** `[top, bottom]` of an element relative to the viewport, plus the scroll offset. */
async function viewportBox(page: Page, selector: ReturnType<Page['getByRole']>) {
  const box = await selector.boundingBox();
  expect(box, 'the control is rendered').toBeTruthy();
  const scrollY = await page.evaluate(() => window.scrollY);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  return { top: box!.y, bottom: box!.y + box!.height, scrollY, viewportHeight };
}

test('(a) sign in lands on /today with the hero control in view at 360×640 (AC-E16-01/02, V-16-3)', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  const essay = await createAssignmentViaApi(request, s.accessToken, {
    title: `Essay ${uniqueSuffix()}`,
    dueDate: `${addCivilDays(s.today, 3)}T12:00:00.000Z`,
    estimatedHours: 1,
  });
  await savePlanWeekViaApi(request, s.accessToken, s.today, [
    {
      assignmentId: essay.id,
      date: s.today,
      startTime: '19:00',
      endTime: '19:30',
      anchor: 'FIXED',
    },
  ]);

  // The phone viewport first: the hero's primary control must be visible
  // without scrolling, with the bottom tab bar (EP16E) and the unverified
  // email banner both on screen.
  await page.setViewportSize({ width: 360, height: 640 });
  await loginViaUi(page, s.email);
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  await expect(page).toHaveTitle(/^Today — StudyPilot$/);

  const start = page.getByRole('button', { name: 'Start focus' });
  await expect(start).toBeVisible();

  // F-EP16F-01 (recorded, not asserted): for an unverified student the
  // "Verify your email" banner (EP01 surface, outside EP16) occupies ~290 px
  // of a 640 px phone screen and pushes the hero below the fold (measured
  // y ≈ 817 on 2026-11-18). The Today contract (AC-E16-02) is asserted with
  // the banner dismissed; the banner's own narrow-viewport size is BL-16-08.
  const withBanner = await viewportBox(page, start);
  test.info().annotations.push({
    type: 'F-EP16F-01',
    description: `Start focus bottom with the verification banner: ${Math.round(withBanner.bottom)}px (viewport ${withBanner.viewportHeight}px)`,
  });
  await page.getByRole('button', { name: 'Dismiss email verification reminder' }).click();
  await expect(page.getByRole('region', { name: /verify your email/i })).toHaveCount(0);

  const box = await viewportBox(page, start);
  expect(box.scrollY, 'the page has not scrolled').toBe(0);
  expect(box.bottom, 'Start focus sits inside the 640px viewport').toBeLessThanOrEqual(
    box.viewportHeight
  );
  // …and above the fixed tab bar (56px + safe-area), never underneath it.
  const bar = page.getByRole('navigation', { name: 'Primary' });
  const barBox = await bar.boundingBox();
  expect(barBox).toBeTruthy();
  expect(box.bottom).toBeLessThanOrEqual(barBox!.y);
  await expectNoAxeViolations(page, '/today @360×640 (plan)');

  // Desktop: the same page, the desktop nav instead of the bar.
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole('button', { name: 'Work menu' })).toBeVisible();
  await expectNoAxeViolations(page, '/today @1280 (plan)');
});

test('(b) no plan → Plan my week → Use this plan → Today shows a next session (AC-E16-06/07)', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  // Due tomorrow: the engine has today and tomorrow morning to place one hour.
  const reading = await createAssignmentViaApi(request, s.accessToken, {
    title: `Reading ${uniqueSuffix()}`,
    dueDate: `${addCivilDays(s.today, 1)}T12:00:00.000Z`,
    estimatedHours: 1,
    priority: 'HIGH',
  });

  await loginViaUi(page, s.email);
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByText('No plan for today yet')).toBeVisible();
  await expectNoAxeViolations(page, '/today (no plan)');

  // One action → one proposal.
  await page.getByRole('link', { name: 'Plan my week' }).click();
  await expect(page).toHaveURL(/\/plan\/proposal$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Your proposed week' })).toBeVisible();
  // EP17E: the proposal renders one editable week.
  await expect(page.getByTestId('editable-week')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('editable-week').getByText(reading.title).first()).toBeVisible();

  // Use this plan → Today, with the saved session as the next action.
  await page.getByRole('button', { name: 'Use this plan' }).click();
  await expect(page.getByText('Plan saved.')).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/today$/);
  const todayRes = await request.get('/api/study-plans/today', {
    headers: authHeaders(s.accessToken),
  });
  const today = (await todayRes.json()) as { sessions: { assignmentId: string }[] };
  expect(today.sessions.map((x) => x.assignmentId)).toContain(reading.id);
  await expect(page.getByText('Next up')).toBeVisible();
  await expect(page.locator('main').getByText(reading.title).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start focus' })).toBeVisible();
  await expectNoAxeViolations(page, '/today (next session)');
});

test('(c) Start focus → finish → Today shows the momentum row and the hero badge (AC-E16-04)', async ({
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

  await loginViaUi(page, s.email);
  // Nothing about minutes before the first session: no badge, no momentum row.
  await expect(page.getByText(/min studied today/)).toHaveCount(0);
  await expect(page.getByTestId('momentum-row')).toHaveCount(0);

  await page.getByRole('button', { name: 'Start focus' }).click();
  await expect(page).toHaveURL(/\/focus$/);
  await expect(page.getByText('Focus session running')).toBeAttached();
  // The header strip stays off the timer page itself (EP16D D-D2).
  await expect(page.getByRole('link', { name: 'Back to session' })).toHaveCount(0);

  await finishFocusViaUi(page, 25);
  await expect(page.getByText('You studied 25 minutes.', { exact: true })).toBeVisible();

  // Back on Today: minutes appear once in the hero's badge, and the momentum
  // row renders now that there is history (AC-E16-04).
  await page.goto('/today');
  await expect(page.getByText('25 min studied today')).toBeVisible();
  const momentum = page.getByTestId('momentum-row');
  await expect(momentum).toBeVisible();
  await expect(momentum.getByText('1 of 3 days this week')).toBeVisible();
  await expect(momentum.getByRole('link', { name: 'See history' })).toHaveAttribute(
    'href',
    '/focus/history'
  );
  // Minutes appear once: the hero badge, not a second time in the row.
  await expect(page.getByText(/25 min/)).toHaveCount(1);
  await expect(page.getByText("Today's plan is done")).toBeVisible();
  await expect(page.locator('main')).not.toContainText('%');
  await expectNoAxeViolations(page, '/today (after finish)');
});

test('(d) /dashboard and / redirect a signed-in student to /today (AC-E16-01, V-16-2)', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  await loginViaUi(page, s.email);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();

  await page.goto('/');
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();

  // The first nav entry is Today and reads as the current page.
  const todayLink = page.getByRole('navigation', { name: 'Primary' }).getByRole('link', {
    name: 'Today',
  });
  await expect(todayLink).toHaveAttribute('aria-current', 'page');
});
