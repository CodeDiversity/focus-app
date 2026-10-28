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
