import { expect, test } from '@playwright/test';

import {
  authHeaders,
  createAssignmentViaApi,
  createAuthenticatedUserViaApi,
  createAvailabilitySlotViaApi,
  createCourseViaApi,
  createSemesterViaApi,
  loginViaUi,
} from './helpers';

test.describe.configure({ mode: 'serial' });

const uniqueSuffix = () => `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const todayUTC = () => new Date().toISOString().slice(0, 10);

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

  // Availability windows on every weekday.
  for (let d = 0; d < 7; d++) {
    await createAvailabilitySlotViaApi(request, accessToken, {
      dayOfWeek: d,
      startTime: '08:00',
      endTime: '20:00',
      isAvailable: true,
    });
  }

  const today = todayUTC();
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
    // Two hours → two sessions, so the move target and the delete target are
    // independent rows on every weekday (EP14C: Mondays place exactly one
    // movable row otherwise — the 09:00 class pins a1's morning slot).
    estimatedHours: 2,
    priority: 'MEDIUM',
  });

  await loginViaUi(page, email);

  // Set study preferences through the profile page.
  await page.goto('/profile');
  await page.getByRole('button', { name: /save study preferences/i }).click();
  await expect(page.getByText('Study preferences saved.')).toBeVisible();

  await page.goto('/plan');

  // Generate, capturing the engine's own proposal (EP14C D-C1: the edit
  // target is chosen from it, never blindly).
  const [previewRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/study-plans/preview') && r.request().method() === 'POST'
    ),
    page.getByRole('button', { name: /generate plan/i }).click(),
  ]);
  const preview = (await previewRes.json()) as {
    days: {
      date: string;
      sessions: { startTime: string; endTime: string; assignmentTitle: string }[];
    }[];
  };
  await expect(page.getByTestId('plan-week')).toBeVisible({ timeout: 30_000 });

  // Seven days rendered.
  const daySections = page.locator('[data-testid="plan-week"] > section');
  await expect(daySections).toHaveCount(7);

  // Proposed sessions present.
  await expect(page.getByTestId('plan-session-editor').getByText(a1.title)).toBeVisible();
  await expect(page.getByTestId('plan-session-editor').getByText(a2.title).first()).toBeVisible();

  // Move a session 15 minutes later — one whose shifted window the preview
  // itself proves free (EP14C D-C1, closes the F-EP13M-06 date dependence:
  // `.first()` landed on the Monday 09:00 class whenever today was a Monday).
  const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  const flat = preview.days.flatMap((d) =>
    d.sessions.map((sess, si) => ({ ...sess, date: d.date, last: si === d.sessions.length - 1 }))
  );
  const classOnDate = (date: string) =>
    new Date(`${date}T00:00:00.000Z`).getUTCDay() === 1 ? [{ s: 540, e: 600 }] : []; // Mon 09:00–10:00
  const movable = flat
    .map((sess, i) => ({ sess, i }))
    .filter(({ sess, i }) => {
      const s0 = minutes(sess.startTime) + 15;
      const e0 = minutes(sess.endTime) + 15;
      if (classOnDate(sess.date).some((c) => s0 < c.e && c.s < e0)) return false;
      // Keep clear of the next proposal on the same day after the shift.
      const next = flat[i + 1];
      if (!sess.last && next && minutes(next.startTime) < e0) return false;
      return true;
    });
  expect(movable.length).toBeGreaterThan(0);
  const target = movable[movable.length - 1].i;
  await page
    .getByRole('button', { name: /move later 15 minutes/i })
    .nth(target)
    .click();

  // Delete a session — never the one just moved, and never a1's only row
  // (the post-save assertions expect a1 visible) (EP14C: the old blind
  // `.last()` could erase the move when the only safe target was last).
  const deletable = flat
    .map((sess, i) => ({ sess, i }))
    .filter(({ sess, i }) => i !== target && sess.assignmentTitle !== a1.title);
  expect(deletable.length).toBeGreaterThan(0);
  const deleteIdx = deletable[deletable.length - 1].i;
  await page
    .getByRole('button', { name: /delete session/i })
    .nth(deleteIdx)
    .click();

  // Save.
  await page.getByRole('button', { name: /save plan/i }).click();
  await expect(page.getByText('Plan saved.')).toBeVisible({ timeout: 15_000 });

  // Saved week renders.
  await expect(page.getByTestId('plan-week')).toBeVisible();
  await expect(page.getByTestId('plan-week').getByText(a1.title)).toBeVisible();

  // Reload and assert saved plan still there.
  await page.reload();
  await expect(page.getByTestId('plan-week')).toBeVisible({ timeout: 30_000 });
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

  for (let d = 0; d < 7; d++) {
    await createAvailabilitySlotViaApi(request, accessToken, {
      dayOfWeek: d,
      startTime: '08:00',
      endTime: '09:00',
      isAvailable: true,
    });
  }

  const today = todayUTC();
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
  // EP14C (F-EP14C-01 family): a click can land during the today-card query's
  // re-render and be lost — retry the idempotent generate until the preview
  // renders, as a human would.
  await expect(async () => {
    await page.getByRole('button', { name: /generate plan/i }).click();
    await expect(page.getByTestId('plan-week')).toBeVisible({ timeout: 10_000 });
  }).toPass({ timeout: 45_000 });
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

  for (let d = 0; d < 7; d++) {
    await createAvailabilitySlotViaApi(request, accessToken, {
      dayOfWeek: d,
      startTime: '08:00',
      endTime: '20:00',
      isAvailable: true,
    });
  }

  const today = todayUTC();
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
  const today = todayUTC();
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

  for (let d = 0; d < 7; d++) {
    await createAvailabilitySlotViaApi(request, accessToken, {
      dayOfWeek: d,
      startTime: '08:00',
      endTime: '20:00',
      isAvailable: true,
    });
  }

  const today = todayUTC();
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
