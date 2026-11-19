import { expect, test, type APIRequestContext } from '@playwright/test';

import {
  addCivilDays,
  authHeaders,
  axeViolations,
  completeOnboardingViaApi,
  createAssignmentViaApi,
  createAuthenticatedUserViaApi,
  getServerWindow,
  loginViaUi,
  setDayBoundsViaApi,
} from './helpers';

/**
 * EP16F — navigation, the session indicator and the bottom tab bar end to end
 * (TR-E16-03; AC-E16-09/10/11, D16-6, D16-7, D16-11). The shell is asserted
 * positively (exactly the contract) and negatively (none of the retired
 * entries), at desktop and at 360 × 640.
 */

test.describe.configure({ mode: 'serial' });

const uniqueSuffix = () => `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

async function newStudent(request: APIRequestContext) {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);
  await setDayBoundsViaApi(request, accessToken, { wakeTime: '08:00', sleepTime: '20:00' });
  await completeOnboardingViaApi(request, accessToken);
  const win = await getServerWindow(request, accessToken);
  return { email, accessToken, ...win };
}

const RETIRED_SHELL_TEXT = ['Dashboard', 'Plan health', 'Focus session', 'Academics', 'Planning'];

test('desktop: exactly Today, Plan, Calendar, Work ▾ (Assignments, Courses) and the account menu (AC-E16-09)', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  await loginViaUi(page, s.email);
  await expect(page).toHaveURL(/\/today$/);

  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav).toHaveCount(1);
  await expect(nav.getByRole('link')).toHaveText(['Today', 'Plan', 'Calendar']);
  await expect(nav.getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/today');
  await expect(nav.getByRole('link', { name: 'Plan' })).toHaveAttribute('href', '/plan');
  await expect(nav.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/calendar');
  await expect(nav.getByRole('button')).toHaveText(['Work']);

  await nav.getByRole('button', { name: 'Work menu' }).click();
  const menu = page.getByRole('menu', { name: 'Work' });
  await expect(menu.getByRole('menuitem')).toHaveText(['Assignments', 'Courses']);
  await expect(menu.getByRole('menuitem', { name: 'Assignments' })).toHaveAttribute(
    'href',
    '/assignments'
  );
  await expect(menu.getByRole('menuitem', { name: 'Courses' })).toHaveAttribute('href', '/courses');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);

  // The account menu is unchanged (Profile, Verify email while unverified, Logout).
  await page.getByRole('button', { name: 'Open account menu' }).click();
  const account = page.getByRole('menu', { name: 'Account' });
  await expect(account.getByRole('menuitem')).toHaveText(['Profile', 'Verify email', 'Logout']);
  await page.keyboard.press('Escape');

  // Negative: nothing retired survives in the shell, signed in.
  const header = page.getByRole('banner');
  await expect(header.getByRole('link', { name: 'Home' })).toHaveCount(0);
  for (const text of RETIRED_SHELL_TEXT) {
    await expect(header, `"${text}" is gone from the header`).not.toContainText(text);
  }
  const violations = await axeViolations(page);
  expect(violations, `axe on /today (desktop shell):\n${violations.join('\n')}`).toEqual([]);
});

test('signed out: the shell shows Home and the auth buttons only (D16-6)', async ({ page }) => {
  await page.goto('/login');
  const header = page.getByRole('banner');
  await expect(header.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  await expect(header.getByRole('link', { name: 'Today' })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'Work menu' })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'Open account menu' })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'Login' })).toBeVisible();
  await expect(header.getByRole('button', { name: 'Get Started' })).toBeVisible();
});

test('360 × 640: the bottom tab bar carries the five entries and the drawer only Account (AC-E16-11, ▲ D-E1 (b))', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  await page.setViewportSize({ width: 360, height: 640 });
  await loginViaUi(page, s.email);
  await expect(page).toHaveURL(/\/today$/);

  // Exactly one Primary landmark, and it is the bar.
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav).toHaveCount(1);
  await expect(nav.getByRole('link')).toHaveText([
    'Today',
    'Plan',
    'Calendar',
    'Assignments',
    'Courses',
  ]);
  await expect(nav.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
  const barBox = await nav.boundingBox();
  expect(barBox).toBeTruthy();
  expect(barBox!.y + barBox!.height).toBeCloseTo(640, 0);
  for (const tab of await nav.getByRole('link').all()) {
    const box = await tab.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
  // No desktop nav or desktop account trigger below md.
  await expect(page.getByRole('button', { name: 'Work menu' })).toHaveCount(0);

  // The drawer is Account only.
  await page.getByRole('button', { name: 'Open account menu' }).click();
  const drawer = page.getByRole('dialog', { name: 'Account' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('navigation')).toHaveCount(0);
  await expect(drawer.getByRole('link')).toHaveText(['Profile', 'Verify email']);
  await expect(drawer.getByRole('button', { name: 'Logout' })).toBeVisible();
  for (const text of [
    'Today',
    'Plan',
    'Calendar',
    'Assignments',
    'Courses',
    ...RETIRED_SHELL_TEXT,
  ]) {
    await expect(drawer, `"${text}" is not in the Account drawer`).not.toContainText(text);
  }
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);

  // A nested page keeps its parent tab current (D-E7).
  await nav.getByRole('link', { name: 'Courses' }).click();
  await expect(page).toHaveURL(/\/courses$/);
  await expect(nav.getByRole('link', { name: 'Courses' })).toHaveAttribute('aria-current', 'page');

  const violations = await axeViolations(page);
  expect(violations, `axe on /courses @360 (tab bar):\n${violations.join('\n')}`).toEqual([]);
});

test('a running session shows the header indicator everywhere but /focus; the bar hides on /focus while it runs (AC-E16-10, D16-11)', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  const lab = await createAssignmentViaApi(request, s.accessToken, {
    title: `Lab ${uniqueSuffix()}`,
    dueDate: `${addCivilDays(s.today, 3)}T12:00:00.000Z`,
    estimatedHours: 1,
  });

  await loginViaUi(page, s.email);

  // No session: no strip anywhere, and the Focus page is a normal page.
  await page.goto('/calendar');
  await expect(page.getByRole('link', { name: 'Back to session' })).toHaveCount(0);

  // Start a session through the real API (EP07), then move around.
  const open = await request.post('/api/study-sessions', {
    headers: authHeaders(s.accessToken),
    data: { assignmentId: lab.id, plannedMinutes: 25 },
  });
  expect(open.status()).toBe(201);

  await page.goto('/calendar');
  const strip = page.getByRole('link', { name: 'Back to session' });
  await expect(strip).toBeVisible();
  await expect(strip).toHaveAttribute('href', '/focus');
  await expect(page.getByRole('banner')).toContainText(/Running · \d{2}:\d{2}/);
  // The live sentence is announced without the ticking time.
  const live = page.getByRole('banner').locator('[aria-live="polite"]');
  await expect(live).toHaveText('Your focus session is running.');

  await page.goto('/focus/history');
  await expect(page.getByRole('link', { name: 'Back to session' })).toBeVisible();

  // The strip precedes the logo in the tab order (keyboard: first Tab after the skip link).
  await page.goto('/plan');
  await expect(page.getByRole('link', { name: 'Back to session' })).toBeVisible();
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Back to session' })).toBeFocused();

  // On /focus the timer is the page: no strip.
  await strip.click();
  await expect(page).toHaveURL(/\/focus$/);
  await expect(page.getByText('Focus session running')).toBeAttached();
  await expect(page.getByRole('link', { name: 'Back to session' })).toHaveCount(0);

  // Phone: the bar hides on /focus while the session runs, shows elsewhere.
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/focus');
  await expect(page.getByText('Focus session running')).toBeAttached();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
  await page.goto('/today');
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to session' })).toBeVisible();
  const violations = await axeViolations(page);
  expect(violations, `axe on /today @360 (strip + bar):\n${violations.join('\n')}`).toEqual([]);
});

test('Semesters is reachable from Courses and Study history from the Focus page (AC-E16-09, D-D7)', async ({
  page,
  request,
}) => {
  const s = await newStudent(request);
  await loginViaUi(page, s.email);

  await page.goto('/courses');
  await expect(page.getByRole('heading', { level: 1, name: 'My Courses' })).toBeVisible();
  await page.getByRole('link', { name: 'Semesters' }).click();
  await expect(page).toHaveURL(/\/semesters$/);

  await page.goto('/focus');
  await expect(page.getByRole('heading', { level: 1, name: 'Focus session' })).toBeVisible();
  await expect(page.getByText('No focus session in progress')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to Today' })).toHaveAttribute('href', '/today');
  await page.getByRole('link', { name: 'Study history' }).click();
  await expect(page).toHaveURL(/\/focus\/history$/);

  // Neither has a nav entry (negative, desktop and the drawer-less phone shell).
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav.getByRole('link', { name: 'Semesters' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Study history' })).toHaveCount(0);
});
