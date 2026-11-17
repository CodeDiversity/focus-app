import { expect, test } from '@playwright/test';

import {
  authHeaders,
  civilWeekday,
  createAuthenticatedUserViaApi,
  createCourseViaApi,
  createScheduleBlockViaApi,
  createSemesterViaApi,
  getServerWindow,
  loginViaUi,
  setDayBoundsViaApi,
} from './helpers';

/**
 * SP-127B / SP-129A / EP15E calendar journeys, rewritten for the hour-axis
 * grid (EP15J-AC2). Date discipline (EP14C): every date derives from the
 * server's civil "today" — the class meeting is seeded on today's weekday
 * and the deadline on today, so both sit in the visible week whatever the
 * calendar date; nothing reads the wall clock.
 */

test.describe.configure({ mode: 'serial' });

const uniq = () => `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;

async function seededStudent(request: Parameters<typeof createAuthenticatedUserViaApi>[0]) {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);
  await setDayBoundsViaApi(request, accessToken, { wakeTime: '08:00', sleepTime: '22:00' });
  const { today } = await getServerWindow(request, accessToken);
  const semester = await createSemesterViaApi(request, accessToken, {
    name: `E2E Semester ${uniq()}`,
    startDate: '2026-01-05',
    endDate: '2026-12-18',
  });
  const course = await createCourseViaApi(request, accessToken, {
    code: `E2E-${crypto.randomUUID().slice(0, 8)}`,
    name: `E2E Course ${uniq()}`,
    semesterId: semester.id,
  });
  // Recurring class meeting on today's weekday, 09:00–10:00.
  const meeting = await request.post(`/api/courses/${course.id}/meetings`, {
    headers: authHeaders(accessToken),
    data: { dayOfWeek: civilWeekday(today), startTime: '09:00', endTime: '10:00' },
  });
  expect(meeting.status()).toBe(201);
  // A deadline landing on today (the all-day row).
  const assignmentTitle = `E2E Deadline ${uniq()}`;
  const assignment = await request.post('/api/assignments', {
    headers: authHeaders(accessToken),
    data: { title: assignmentTitle, courseId: course.id, dueDate: `${today}T12:00:00.000Z` },
  });
  expect(assignment.status()).toBe(201);
  return { email, accessToken, today, course, assignmentTitle };
}

test('renders the calendar page for an authenticated user', async ({ page, request }) => {
  const { email } = await createAuthenticatedUserViaApi(request);
  await loginViaUi(page, email);
  await page.goto('/calendar');

  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  // EP15I: the old availability page is retired; the calendar's own "Add"
  // is the one editing entry point (EP15G).
  await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
  // EP15E: the hour axis and the empty-week line.
  await expect(page.getByRole('list', { name: 'Week view' })).toBeVisible();
  await expect(page.getByText('Nothing on your calendar yet — it’s all free time')).toBeVisible();
});

test('navigates between weeks with previous/next/today and keeps the server-derived range', async ({
  page,
  request,
}) => {
  const { email } = await createAuthenticatedUserViaApi(request);
  await loginViaUi(page, email);
  await page.goto('/calendar');
  const statusLine = page.locator('[role="status"]:not([aria-label])');
  await expect(statusLine).toContainText(/Showing \d+ items? for/);
  const initial = await statusLine.textContent();

  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(statusLine).not.toHaveText(initial ?? '');
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(statusLine).toHaveText(initial ?? '');
  await page.getByRole('button', { name: 'Previous week' }).click();
  await page.getByRole('button', { name: 'Today' }).click();
  await expect(statusLine).toHaveText(initial ?? '');
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
});

test('shows a seeded class meeting and deadline on the right day of the grid and opens details', async ({
  page,
  request,
}) => {
  const { email, today, course, assignmentTitle } = await seededStudent(request);
  await loginViaUi(page, email);
  await page.goto('/calendar');

  // Desktop viewport: the week grid, not the agenda (DoD 7 desktop evidence).
  const weekList = page.getByRole('list', { name: 'Week view' });
  await expect(weekList).toBeVisible();
  await expect(page.getByRole('list', { name: 'Week agenda' })).toHaveCount(0);

  // The class sits in today's hour column; the deadline in today's all-day cell.
  const column = page.locator(`[data-day="${today}"]`);
  const chip = column.getByRole('button', {
    name: new RegExp(`^Class\\W*${course.name}\\W*09:00`),
  });
  await expect(chip).toBeVisible();
  const allDay = page.locator(`[data-all-day-for="${today}"]`);
  await expect(allDay.getByText(assignmentTitle)).toBeVisible();
  // Today's header is marked.
  await expect(page.locator('[data-today]')).toHaveCount(1);

  // Details dialog from the chip; Escape closes and returns focus.
  await chip.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(course.name);
  await expect(dialog).toContainText('09:00 – 10:00');
  // A class keeps only its course link — no Edit / Remove (EP15G scope).
  await expect(dialog.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Remove' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(chip).toBeFocused();
});

test('EP15E-AC4: keyboard order within a day follows start time; grid → details → sheet → save by keyboard alone', async ({
  page,
  request,
}) => {
  const { email, accessToken, today, course } = await seededStudent(request);
  // A Busy block after the class on the same day (EP15G editing surface).
  await createScheduleBlockViaApi(request, accessToken, {
    kind: 'BUSY',
    title: 'Lunch run',
    startDate: today,
    startTime: '12:00',
    endTime: '13:00',
  });
  await loginViaUi(page, email);
  await page.goto('/calendar');
  const column = page.locator(`[data-day="${today}"]`);
  const classChip = column.getByRole('button', { name: new RegExp(`^Class\\W*${course.name}`) });
  const busyChip = column.getByRole('button', { name: /Lunch run/ });
  await expect(busyChip).toBeVisible();

  // Tab order: the class (09:00) before the busy block (12:00) — DOM order is start order.
  await classChip.focus();
  await page.keyboard.press('Tab');
  await expect(busyChip).toBeFocused();

  // Enter opens details; Tab reaches Edit; Enter opens the sheet; Title → Enter saves.
  await page.keyboard.press('Enter');
  const details = page.getByRole('dialog', { name: 'Lunch run' });
  await expect(details).toBeVisible();
  const edit = details.getByRole('button', { name: 'Edit' });
  while (!(await edit.evaluate((el) => el === document.activeElement))) {
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: 'Edit Lunch run' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel('Title (optional)')).toBeFocused(); // edit mode starts on Title
  await page.keyboard.type(' (moved)');
  await page.keyboard.press('Enter'); // submits the form — Save is the submit button
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('[role="status"]:not([aria-label])')).toContainText('Busy updated');
  await expect(column.getByRole('button', { name: /Lunch run \(moved\)/ })).toBeVisible();
});

test('SP-129A: at a phone viewport the week renders as the day-grouped agenda', async ({
  page,
  request,
}) => {
  const { email, course } = await seededStudent(request);
  await loginViaUi(page, email);

  // Phone-sized viewport (iPhone 12 ≈ 375×667) before loading the calendar.
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/calendar');

  const agenda = page.getByRole('list', { name: 'Week agenda' });
  const weekList = page.getByRole('list', { name: 'Week view' });
  await expect(agenda).toBeVisible();
  // EP15E (D-E10): the agenda chip reads "Class: 09:00–10:00, <course>".
  const entry = page.getByRole('button', { name: new RegExp(`^Class\\W*09:00.*${course.name}`) });
  await expect(entry).toBeVisible();
  await expect(page.getByText(/^Class:?$/).first()).toBeVisible();

  // No horizontal scrolling at 375px.
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);

  // An agenda entry opens the details dialog; Escape closes it.
  await entry.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(course.name);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // Real tap-target height at 375px (AC 6).
  const box = await entry.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  // Keyboard operability (DoD 6): Enter opens, Escape closes, focus returns.
  await entry.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(entry).toBeFocused();

  // Live responsive switch (DoD 7): tablet width flips back to the grid — no reload.
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(weekList).toBeVisible();
  await expect(page.getByRole('list', { name: 'Week agenda' })).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(weekList).toBeVisible();
});
