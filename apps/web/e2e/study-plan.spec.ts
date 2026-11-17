import { expect, test } from '@playwright/test';

import {
  authHeaders,
  createAssignmentViaApi,
  createAuthenticatedUserViaApi,
  setDayBoundsViaApi,
  createCourseViaApi,
  createSemesterViaApi,
  getServerWindow,
  loginViaUi,
} from './helpers';

test.describe.configure({ mode: 'serial' });

const uniqueSuffix = () => `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

test('journey: generate, edit, save, and survive a reload', async ({ page, request }) => {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);

  const semester = await createSemesterViaApi(request, accessToken, {
    name: `E2E Semester ${uniqueSuffix()}`,
    startDate: '2026-01-05',
    endDate: '2026-05-15',
  });
  const course = await createCourseViaApi(request, accessToken, {
    code: `E2E-${crypto.randomUUID().slice(0, 8)}`,
    name: `E2E Course ${uniqueSuffix()}`,
    semesterId: semester.id,
  });

  // Recurring class meeting on Monday (day 1).
  const meetingRes = await request.post(`/api/courses/${course.id}/meetings`, {
    headers: authHeaders(accessToken),
    data: { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
  });
  expect(meetingRes.status()).toBe(201);

  // Day bounds on every weekday (EP15D).
  await setDayBoundsViaApi(request, accessToken, { wakeTime: '08:00', sleepTime: '20:00' });

  // EP14C (D-M2 discipline): "today" is the server's, never the wall clock's.
  const { today } = await getServerWindow(request, accessToken);
  const due = `${addDays(today, 5)}T12:00:00.000Z`;
  const a1 = await createAssignmentViaApi(request, accessToken, {
    title: `Essay ${uniqueSuffix()}`,
    courseId: course.id,
    dueDate: due,
    estimatedHours: 1,
    priority: 'HIGH',
  });
  const a2 = await createAssignmentViaApi(request, accessToken, {
    title: `Reading ${uniqueSuffix()}`,
    courseId: course.id,
    dueDate: due,
    estimatedHours: 1,
    priority: 'MEDIUM',
  });

  await loginViaUi(page, email);

  // Set study preferences through the profile page.
  await page.goto('/profile');
  await page.getByRole('button', { name: /save study preferences/i }).click();
  await expect(page.getByText('Study preferences saved.')).toBeVisible();

  await page.goto('/plan');

  // Generate.
  await page.getByRole('button', { name: /generate plan/i }).click();
  await expect(page.getByTestId('plan-week')).toBeVisible({ timeout: 15_000 });

  // Seven days rendered.
  const daySections = page.locator('[data-testid="plan-week"] > section');
  await expect(daySections).toHaveCount(7);

  // Proposed sessions present.
  await expect(page.getByTestId('plan-session-editor').getByText(a1.title)).toBeVisible();
  await expect(page.getByTestId('plan-session-editor').getByText(a2.title)).toBeVisible();

  // Move a session 15 minutes later — EP14C (D-C1, F-EP13M-06): choose, from
  // the engine's real output, the first proposal whose shifted window stays
  // clear of the Monday 09:00–10:00 class and inside the 20:00 availability
  // edge. Moving `.first()` blindly failed on any Monday, where the engine
  // rightly placed 08:00–09:00 right before the class.
  const rows = page.getByTestId('plan-session-editor').locator('article');
  const rowCount = await rows.count();
  let target = -1;
  for (let i = 0; i < rowCount && target < 0; i++) {
    const row = rows.nth(i);
    const date = await row.getByLabel('Day').inputValue();
    const start = minutesOf(await row.getByLabel('Start time').inputValue()) + 15;
    const end = minutesOf(await row.getByLabel('End time').inputValue()) + 15;
    const isMonday = new Date(`${date}T00:00:00.000Z`).getUTCDay() === 1;
    const hitsClass = isMonday && start < 10 * 60 && end > 9 * 60;
    if (!hitsClass && end <= 20 * 60) target = i;
  }
  expect(
    target,
    'a proposal that can move 15 minutes without hitting the class'
  ).toBeGreaterThanOrEqual(0);
  await rows.nth(target).getByRole('button', { name: 'Move later 15 minutes' }).click();

  // Delete a session.
  const deleteBtn = page.getByRole('button', { name: /delete session/i }).last();
  await deleteBtn.click();

  // Save.
  await page.getByRole('button', { name: /save plan/i }).click();
  await expect(page.getByText('Plan saved.')).toBeVisible({ timeout: 15_000 });

  // Saved week renders.
  await expect(page.getByTestId('plan-week')).toBeVisible();
  await expect(page.getByTestId('plan-week').getByText(a1.title)).toBeVisible();

  // Reload and assert saved plan still there.
  await page.reload();
  await expect(page.getByTestId('plan-week')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('plan-week').getByText(a1.title)).toBeVisible();
});

test('deficit warning reports an assignment that cannot fit', async ({ page, request }) => {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);

  const semester = await createSemesterViaApi(request, accessToken, {
    name: `E2E Semester ${uniqueSuffix()}`,
    startDate: '2026-01-05',
    endDate: '2026-05-15',
  });
  const course = await createCourseViaApi(request, accessToken, {
    code: `E2E-${crypto.randomUUID().slice(0, 8)}`,
    name: `E2E Course ${uniqueSuffix()}`,
    semesterId: semester.id,
  });

  await setDayBoundsViaApi(request, accessToken, { wakeTime: '08:00', sleepTime: '09:00' });

  // EP14C (D-M2 discipline): "today" is the server's, never the wall clock's.
  const { today } = await getServerWindow(request, accessToken);
  const due = `${addDays(today, 2)}T12:00:00.000Z`;
  await createAssignmentViaApi(request, accessToken, {
    title: `Big ${uniqueSuffix()}`,
    courseId: course.id,
    dueDate: due,
    estimatedHours: 10,
    priority: 'HIGH',
  });

  await loginViaUi(page, email);
  await page.goto('/profile');
  await page.getByRole('button', { name: /save study preferences/i }).click();
  await expect(page.getByText('Study preferences saved.')).toBeVisible();

  await page.goto('/plan');
  await page.getByRole('button', { name: /generate plan/i }).click();
  await expect(page.getByTestId('plan-week')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/do not fit/i)).toBeVisible({ timeout: 15_000 });
});

test('flagged marker shows for an assignment with no estimate', async ({ page, request }) => {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);

  const semester = await createSemesterViaApi(request, accessToken, {
    name: `E2E Semester ${uniqueSuffix()}`,
    startDate: '2026-01-05',
    endDate: '2026-05-15',
  });
  const course = await createCourseViaApi(request, accessToken, {
    code: `E2E-${crypto.randomUUID().slice(0, 8)}`,
    name: `E2E Course ${uniqueSuffix()}`,
    semesterId: semester.id,
  });

  await setDayBoundsViaApi(request, accessToken, { wakeTime: '08:00', sleepTime: '20:00' });

  // EP14C (D-M2 discipline): "today" is the server's, never the wall clock's.
  const { today } = await getServerWindow(request, accessToken);
  const due = `${addDays(today, 5)}T12:00:00.000Z`;
  const flaggedTitle = `Flagged ${uniqueSuffix()}`;
  await createAssignmentViaApi(request, accessToken, {
    title: flaggedTitle,
    courseId: course.id,
    dueDate: due,
    priority: 'MEDIUM',
  });

  await loginViaUi(page, email);
  await page.goto('/profile');
  await page.getByRole('button', { name: /save study preferences/i }).click();
  await expect(page.getByText('Study preferences saved.')).toBeVisible();

  await page.goto('/plan');
  await expect(page.getByText('No estimate')).toBeVisible({ timeout: 15_000 });
});

test('isolation: a second student assignment is invisible and a save naming it is rejected', async ({
  request,
}) => {
  const user1 = await createAuthenticatedUserViaApi(request);
  const user2 = await createAuthenticatedUserViaApi(request);

  const semester = await createSemesterViaApi(request, user2.accessToken, {
    name: `E2E Semester ${uniqueSuffix()}`,
    startDate: '2026-01-05',
    endDate: '2026-05-15',
  });
  const course = await createCourseViaApi(request, user2.accessToken, {
    code: `E2E-${crypto.randomUUID().slice(0, 8)}`,
    name: `E2E Course ${uniqueSuffix()}`,
    semesterId: semester.id,
  });
  // EP14C (D-M2 discipline): "today" is the server's, never the wall clock's.
  const { today } = await getServerWindow(request, user1.accessToken);
  const due = `${addDays(today, 5)}T12:00:00.000Z`;
  const foreign = await createAssignmentViaApi(request, user2.accessToken, {
    title: `Foreign ${uniqueSuffix()}`,
    courseId: course.id,
    dueDate: due,
    estimatedHours: 1,
  });

  // user1 remaining-work must not include the foreign assignment.
  const rwRes = await request.get('/api/study-plans/remaining-work', {
    headers: authHeaders(user1.accessToken),
  });
  expect(rwRes.status()).toBe(200);
  const rw = (await rwRes.json()) as { items: { assignmentId: string }[] };
  expect(rw.items.map((i) => i.assignmentId)).not.toContain(foreign.id);

  // user1 window.
  const planRes = await request.get('/api/study-plans', {
    headers: authHeaders(user1.accessToken),
  });
  expect(planRes.status()).toBe(200);
  const plan = (await planRes.json()) as { from: string; to: string };

  // Save naming the foreign assignment → 404.
  const saveRes = await request.post('/api/study-plans', {
    headers: authHeaders(user1.accessToken),
    data: {
      from: plan.from,
      to: plan.to,
      sessions: [
        { assignmentId: foreign.id, date: plan.from, startTime: '09:00', endTime: '10:00' },
      ],
    },
  });
  expect(saveRes.status()).toBe(404);
});

test('conflict: a save naming a slot inside a class meeting is rejected with 409', async ({
  request,
}) => {
  const { accessToken } = await createAuthenticatedUserViaApi(request);

  const semester = await createSemesterViaApi(request, accessToken, {
    name: `E2E Semester ${uniqueSuffix()}`,
    startDate: '2026-01-05',
    endDate: '2026-05-15',
  });
  const course = await createCourseViaApi(request, accessToken, {
    code: `E2E-${crypto.randomUUID().slice(0, 8)}`,
    name: `E2E Course ${uniqueSuffix()}`,
    semesterId: semester.id,
  });

  // Class meeting on every weekday 09:00-10:00.
  for (let d = 0; d < 7; d++) {
    const mr = await request.post(`/api/courses/${course.id}/meetings`, {
      headers: authHeaders(accessToken),
      data: { dayOfWeek: d, startTime: '09:00', endTime: '10:00' },
    });
    expect(mr.status()).toBe(201);
  }

  await setDayBoundsViaApi(request, accessToken, { wakeTime: '08:00', sleepTime: '20:00' });

  // EP14C (D-M2 discipline): "today" is the server's, never the wall clock's.
  const { today } = await getServerWindow(request, accessToken);
  const due = `${addDays(today, 5)}T12:00:00.000Z`;
  const assignment = await createAssignmentViaApi(request, accessToken, {
    title: `Conflict ${uniqueSuffix()}`,
    courseId: course.id,
    dueDate: due,
    estimatedHours: 1,
  });

  const planRes = await request.get('/api/study-plans', {
    headers: authHeaders(accessToken),
  });
  const plan = (await planRes.json()) as { from: string; to: string };

  const saveRes = await request.post('/api/study-plans', {
    headers: authHeaders(accessToken),
    data: {
      from: plan.from,
      to: plan.to,
      sessions: [
        { assignmentId: assignment.id, date: plan.from, startTime: '09:00', endTime: '10:00' },
      ],
    },
  });
  expect(saveRes.status()).toBe(409);
  const body = (await saveRes.json()) as { conflicts?: unknown[] };
  expect(Array.isArray(body.conflicts)).toBe(true);

  // Plan unchanged: no sessions.
  const afterRes = await request.get('/api/study-plans', {
    headers: authHeaders(accessToken),
  });
  const after = (await afterRes.json()) as { days: { sessions: unknown[] }[] };
  expect(after.days.every((d) => d.sessions.length === 0)).toBe(true);
});
