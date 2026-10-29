import { expect, test } from '@playwright/test';

import {
  authHeaders,
  createAuthenticatedUserViaApi,
  createCourseViaApi,
  createSemesterViaApi,
  loginViaUi,
} from './helpers';

test.describe.configure({ mode: 'serial' });

test('renders the calendar page for an authenticated user', async ({ page, request }) => {
  const { email } = await createAuthenticatedUserViaApi(request);
  await loginViaUi(page, email);
  await page.goto('/calendar');

  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  // The page may render two "Manage availability" links (toolbar + empty
  // state); strict mode requires a single locator, so assert the first only.
  await expect(page.getByRole('link', { name: 'Manage availability' }).first()).toBeVisible();
});

test('navigates between weeks with previous/next', async ({ page, request }) => {
  const { email } = await createAuthenticatedUserViaApi(request);
  await loginViaUi(page, email);
  await page.goto('/calendar');

  await page.getByRole('button', { name: 'Next week' }).click();
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
});

test('shows a seeded class meeting and assignment deadline on the right days and opens details', async ({
  page,
  request,
}) => {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);

  const semester = await createSemesterViaApi(request, accessToken, {
    name: `E2E Semester ${Date.now()}`,
    startDate: '2026-01-05',
    endDate: '2026-05-15',
  });
  const course = await createCourseViaApi(request, accessToken, {
    code: `E2E-${crypto.randomUUID().slice(0, 8)}`,
    name: `E2E Course ${Date.now()}`,
    semesterId: semester.id,
  });

  // Monday of the current week (the calendar defaults to the current week).
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const mondayISO = monday.toISOString().slice(0, 10);

  // Recurring class meeting on Monday.
  const meetingResponse = await request.post(`/api/courses/${course.id}/meetings`, {
    headers: authHeaders(accessToken),
    data: { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
  });
  expect(meetingResponse.status()).toBe(201);

  // Assignment deadline landing on that Monday.
  const assignmentTitle = `E2E Deadline ${Date.now()}`;
  const assignmentResponse = await request.post('/api/assignments', {
    headers: authHeaders(accessToken),
    data: {
      title: assignmentTitle,
      courseId: course.id,
      dueDate: `${mondayISO}T12:00:00.000Z`,
    },
  });
  expect(assignmentResponse.status()).toBe(201);

  await loginViaUi(page, email);
  await page.goto('/calendar');

  // Desktop viewport (Playwright default): the week grid renders, not the
  // agenda (DoD 7 desktop evidence; R129-003).
  const weekList = page.getByRole('list', { name: 'Week view' });
  await expect(weekList).toBeVisible();
  await expect(page.getByRole('list', { name: 'Week agenda' })).toHaveCount(0);

  // Both events render as chips.
  await expect(page.getByText(course.name)).toBeVisible();
  await expect(page.getByText(assignmentTitle)).toBeVisible();

  // Opening a chip shows the details dialog.
  const chip = page.getByRole('button', { name: new RegExp(`Class: ${course.name}, 09:00`) });
  await chip.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(course.name);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('SP-129A: at a phone viewport the week renders as the day-grouped agenda', async ({
  page,
  request,
}) => {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);

  const semester = await createSemesterViaApi(request, accessToken, {
    name: `E2E Agenda Semester ${Date.now()}`,
    startDate: '2026-01-05',
    endDate: '2026-05-15',
  });
  const course = await createCourseViaApi(request, accessToken, {
    code: `E2E-${crypto.randomUUID().slice(0, 8)}`,
    name: `E2E Agenda Course ${Date.now()}`,
    semesterId: semester.id,
  });

  // The meeting is Monday-only (dayOfWeek 1); the calendar defaults to the
  // current week, so no explicit date range is needed.
  const meetingResponse = await request.post(`/api/courses/${course.id}/meetings`, {
    headers: authHeaders(accessToken),
    data: { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
  });
  expect(meetingResponse.status()).toBe(201);

  await loginViaUi(page, email);

  // Phone-sized viewport (iPhone 12 ≈ 375×667) before loading the calendar.
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/calendar');

  // The agenda replaces the week grid below the sm breakpoint; each entry
  // carries its time + title (accessible name) and its type label as text.
  const agenda = page.getByRole('list', { name: 'Week agenda' });
  const weekList = page.getByRole('list', { name: 'Week view' });
  await expect(agenda).toBeVisible();
  const entry = page.getByRole('button', { name: `Class: ${course.name}, 09:00` });
  await expect(entry).toBeVisible();
  await expect(page.getByText('Class', { exact: true })).toBeVisible();

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

  // Real tap-target height at 375px: the interactive entry is ≥ 44px (AC 6).
  const box = await entry.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  // Keyboard operability (DoD 6): focusing the entry and pressing Enter opens
  // the dialog; Escape closes it and focus returns to the entry (R129-003).
  await entry.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(entry).toBeFocused();

  // Live responsive switch (DoD 7): growing to a tablet width flips the page
  // back to the week grid — no reload — and it stays there on desktop.
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(weekList).toBeVisible();
  await expect(page.getByRole('list', { name: 'Week agenda' })).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(weekList).toBeVisible();
});

test('SP-128B: slots created on /availability appear on the calendar as available and blocked events', async ({
  page,
  request,
}) => {
  const { email } = await createAuthenticatedUserViaApi(request);
  await loginViaUi(page, email);

  // Start empty and land on the page (SP-128B empty state).
  await page.goto('/availability');
  await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible();
  await expect(page.getByText('No availability yet.')).toBeVisible();

  // An available window on Monday (create default kind: "Available window").
  await page.getByRole('button', { name: 'Add time slot' }).click();
  const form = page.getByRole('dialog');
  await expect(form.getByRole('heading', { name: 'Add a time slot' })).toBeVisible();
  await expect(form.getByRole('radio', { name: 'Available window' })).toBeChecked();
  await form.getByLabel('Start time').fill('09:00');
  await form.getByLabel('End time').fill('10:30');
  await form.getByRole('button', { name: 'Create time slot' }).click();
  await expect(page.getByRole('dialog', { name: 'Add a time slot' })).toHaveCount(0);
  await expect(page.getByText('Mon 09:00–10:30')).toBeVisible();
  await expect(page.getByText('Available window added.')).toBeVisible();

  // A blocked time on Wednesday evening through the same dialog.
  await page.getByRole('button', { name: 'Add time slot' }).click();
  const form2 = page.getByRole('dialog', { name: 'Add a time slot' });
  await form2.getByRole('radio', { name: 'Blocked time' }).check();
  await form2.getByLabel('Day').selectOption('3');
  await form2.getByLabel('Start time').fill('20:00');
  await form2.getByLabel('End time').fill('22:00');
  await form2.getByRole('button', { name: 'Create time slot' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Wed 20:00–22:00')).toBeVisible();
  // The kind distinction is textual next to the matching icon (the badge is
  // the exact "Blocked" text; the status line's sentence is its own match).
  await expect(page.getByText('Blocked', { exact: true })).toBeVisible();
  await expect(page.getByText('Showing 2 time slots.')).toBeVisible();

  // The calendar (SP-127A/127B read model) shows both recurring events.
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Available: Available, 09:00' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Blocked: Blocked time, 20:00' })).toBeVisible();
});
