import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  addCivilDays,
  authHeaders,
  axeViolations,
  civilWeekday,
  createAssignmentViaApi,
  createAuthenticatedUserViaApi,
  createCourseViaApi,
  createScheduleBlockViaApi,
  getCalendarWeekViaApi,
  getServerWindow,
  loginViaUi,
  minutesOfTime,
  overlaps,
  setDayBoundsViaApi,
} from './helpers';

/**
 * EP15J — cross-layer journeys for EP15 Schedule & Availability (TR-E15-10)
 * on the self-contained stack: the calendar and the planner read the same
 * gathering seam (AC-E15-08), so what the student puts on the calendar is
 * exactly what the planner respects (AC-E15-02/05/06). Seeding goes through
 * the public API only (D-J1). Date discipline (EP13M D-M2, EP14C): every
 * date derives from the server's civil "today"; the browser clock is never
 * touched; weekly blocks start today on today's weekday so their first
 * occurrence is in the visible week on any calendar date.
 *
 * Grid geometry used by the pointer journey: 60 px per hour (D-E7), and with
 * 08:00–22:00 bounds the visible range starts at 07:00 (gridModel.hourRange),
 * so minute m sits at y = m − 420 within a day column.
 */

test.describe.configure({ mode: 'serial' });

const uniq = () => `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;

interface Student {
  email: string;
  accessToken: string;
  today: string;
  to: string;
}

async function newStudent(
  request: APIRequestContext,
  bounds?: { wakeTime: string; sleepTime: string }
): Promise<Student> {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);
  if (bounds) await setDayBoundsViaApi(request, accessToken, bounds);
  const win = await getServerWindow(request, accessToken);
  return { email, accessToken, ...win };
}

const weekOf = (today: string) => {
  const monday = addCivilDays(today, -((civilWeekday(today) + 6) % 7));
  return { from: monday, to: addCivilDays(monday, 6) };
};

// The calendar's status line is the unlabelled role=status (the email banner's resend status is labelled).
const status = (page: Page) => page.locator('[role="status"]:not([aria-label])');

/**
 * The axe gate (EP15J-AC2): no serious/critical WCAG A/AA violation, no
 * ignore predicate. A dialog fades in (opacity 0 → 1 over 200 ms) after a
 * rAF, so the scan waits until the open dialog is fully opaque — sampling
 * mid-fade reads every text in it as low contrast (a sampling artefact, not
 * a defect; the shared helper only waits for animations already running).
 */
async function expectNoAxeViolations(page: Page, surface: string): Promise<void> {
  const dialog = page.getByRole('dialog');
  if ((await dialog.count()) > 0) await expect(dialog.first()).toHaveCSS('opacity', '1');
  const violations = await axeViolations(page);
  expect(violations, `axe on ${surface}:\n${violations.join('\n')}`).toEqual([]);
}

type PreviewResponse = {
  days: {
    date: string;
    sessions: { assignmentId: string; startTime: string; endTime: string; anchor: string }[];
  }[];
};
async function previewViaApi(request: APIRequestContext, accessToken: string) {
  const res = await request.post('/api/study-plans/preview', { headers: authHeaders(accessToken) });
  expect(res.status()).toBe(200);
  return (await res.json()) as PreviewResponse;
}

// ---------------------------------------------------------------------------

test('EP15J-AC1(a): saving day bounds re-shades the grid and relabels free time', async ({
  page,
  request,
}) => {
  const student = await newStudent(request); // unconfigured → the first-run banner shows
  await loginViaUi(page, student.email);
  await page.goto('/calendar');
  await expect(page.getByRole('list', { name: 'Week view' })).toBeVisible();

  // Defaults before: 08:00–23:00 everywhere (D15-13).
  await expect(page.getByRole('button', { name: /^Day starts 08:00/ }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Set it' }).click();
  const sheet = page.getByRole('dialog', { name: 'When does your day start and end?' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('switch', { name: 'Same every day' })).toHaveAttribute(
    'aria-checked',
    'true'
  );
  await sheet.getByLabel('Day starts').fill('07:00');
  await sheet.getByLabel('Day ends').fill('21:00');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(status(page)).toContainText('Day start and end saved.');

  // The shading moved and the free caption follows the new bounds.
  await expect(page.getByRole('button', { name: /^Day starts 07:00/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Day ends 21:00/ }).first()).toBeVisible();
  await expect(page.getByText('Free · 07:00–21:00').first()).toBeVisible();
  await expect(page.getByTestId('day-bounds-banner')).toHaveCount(0);

  // The server-owned read model agrees on every day.
  const week = weekOf(student.today);
  const cal = await getCalendarWeekViaApi(request, student.accessToken, week.from, week.to);
  expect(cal.days.every((d) => d.wakeTime === '07:00' && d.sleepTime === '21:00')).toBe(true);
});

test('EP15J-AC1(b): a weekly Busy shrinks free time and the plan never overlaps it or leaves the bounds', async ({
  page,
  request,
}) => {
  const student = await newStudent(request, { wakeTime: '08:00', sleepTime: '22:00' });
  const course = await createCourseViaApi(request, student.accessToken, {
    code: `SCH-${uniq().slice(-6)}`,
    name: `Schedule Course ${uniq()}`,
  });
  await createAssignmentViaApi(request, student.accessToken, {
    title: `Essay ${uniq()}`,
    courseId: course.id,
    dueDate: `${addCivilDays(student.today, 5)}T23:00:00.000Z`,
    estimatedHours: 4,
    priority: 'HIGH',
    type: 'PAPER',
  });

  await loginViaUi(page, student.email);
  await page.goto('/calendar');
  await expect(page.getByRole('list', { name: 'Week view' })).toBeVisible();

  // Add → the sheet, pre-filled with today; make it a weekly Busy 10:00–12:00.
  await page.getByRole('button', { name: 'Add' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add to calendar' });
  await expect(sheet.getByRole('radio', { name: 'Busy' })).toBeChecked();
  await expect(sheet.getByLabel('Date')).toHaveValue(student.today);
  await sheet.getByLabel('Title (optional)').fill('Work shift');
  await sheet.getByLabel('Start').fill('10:00');
  await sheet.getByLabel('End').fill('12:00');
  await sheet.getByRole('switch', { name: 'Repeats weekly' }).click();
  // The date's weekday is pre-checked (EP15G-AC1) — the series is today's weekday.
  const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const chips = sheet.getByRole('group', { name: 'On these days' });
  await expect(
    chips.getByRole('checkbox', { name: WEEKDAY[civilWeekday(student.today)] })
  ).toBeChecked();
  await expect(chips.getByRole('checkbox', { checked: true })).toHaveCount(1);
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(status(page)).toContainText('Busy added');
  await expect(page.getByRole('button', { name: /Work shift/ })).toBeVisible();

  // The free interval on today shrank around the event (AC-E15-08).
  const week = weekOf(student.today);
  const cal = await getCalendarWeekViaApi(request, student.accessToken, week.from, week.to);
  const todayFree = cal.days.find((d) => d.date === student.today)!.free;
  expect(todayFree.some((f) => overlaps(f.startTime, f.endTime, '10:00', '12:00'))).toBe(false);
  expect(todayFree.map((f) => `${f.startTime}-${f.endTime}`)).toEqual([
    '08:00-10:00',
    '12:00-22:00',
  ]);

  // Generate the plan through the UI, then check the planner's placements.
  await page.goto('/plan');
  await page.getByRole('button', { name: /^(Plan|Replan) my week$/ }).click();
  await expect(page.getByRole('button', { name: 'Use this plan' })).toBeVisible({
    timeout: 15_000,
  });
  const preview = await previewViaApi(request, student.accessToken);
  const sessions = preview.days.flatMap((d) => d.sessions.map((s) => ({ ...s, date: d.date })));
  expect(sessions.length).toBeGreaterThan(0);
  const busyWeekday = civilWeekday(student.today);
  for (const s of sessions) {
    // Inside the day bounds on every day (AC-E15-02) …
    expect(minutesOfTime(s.startTime), `${s.date} ${s.startTime}`).toBeGreaterThanOrEqual(8 * 60);
    expect(minutesOfTime(s.endTime), `${s.date} ${s.endTime}`).toBeLessThanOrEqual(22 * 60);
    // … and never over the weekly event on its weekday (AC-E15-05).
    if (civilWeekday(s.date) === busyWeekday) {
      expect(overlaps(s.startTime, s.endTime, '10:00', '12:00'), `${s.date} ${s.startTime}`).toBe(
        false
      );
    }
  }
});

test("EP15J-AC1(c): a Study block tied to a course is filled first with that course's work", async ({
  page,
  request,
}) => {
  const student = await newStudent(request, { wakeTime: '08:00', sleepTime: '22:00' });
  const tied = await createCourseViaApi(request, student.accessToken, {
    code: `TIE-${uniq().slice(-6)}`,
    name: `Tied Course ${uniq()}`,
  });
  const other = await createCourseViaApi(request, student.accessToken, {
    code: `OTH-${uniq().slice(-6)}`,
    name: `Other Course ${uniq()}`,
  });
  const tiedAssignment = await createAssignmentViaApi(request, student.accessToken, {
    title: `Tied work ${uniq()}`,
    courseId: tied.id,
    dueDate: `${addCivilDays(student.today, 6)}T23:00:00.000Z`,
    estimatedHours: 3,
    priority: 'MEDIUM',
    type: 'HOMEWORK',
  });
  await createAssignmentViaApi(request, student.accessToken, {
    title: `Other work ${uniq()}`,
    courseId: other.id,
    dueDate: `${addCivilDays(student.today, 6)}T23:00:00.000Z`,
    estimatedHours: 3,
    priority: 'MEDIUM',
    type: 'HOMEWORK',
  });
  const blockDay = addCivilDays(student.today, 1); // tomorrow: never partly in the past

  await loginViaUi(page, student.email);
  await page.goto('/calendar');
  await expect(page.getByRole('list', { name: 'Week view' })).toBeVisible();

  // Add → Study, tomorrow 09:00–11:00, tied to the course through "More".
  await page.getByRole('button', { name: 'Add' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add to calendar' });
  await sheet.getByRole('radio', { name: 'Study' }).check();
  await sheet.getByLabel('Date').fill(blockDay);
  await sheet.getByLabel('Start').fill('09:00');
  await sheet.getByLabel('End').fill('11:00');
  await sheet.getByRole('button', { name: 'More' }).click();
  await expect(sheet.getByRole('option', { name: `${tied.code} — ${tied.name}` })).toBeAttached();
  await sheet.getByLabel('Course').selectOption(tied.id);
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(status(page)).toContainText('Study block added');

  // Tomorrow may fall in next week on a Sunday; the block is read back either way.
  const cal = await getCalendarWeekViaApi(request, student.accessToken, blockDay, blockDay);
  const block = cal.events.find((e) => e.type === 'STUDY_BLOCK');
  expect(block?.startTime).toBe('09:00');
  // A study block never reduces free time (AC-E15-07).
  expect(cal.days[0].free.map((f) => `${f.startTime}-${f.endTime}`)).toEqual(['08:00-22:00']);

  await page.goto('/plan');
  await page.getByRole('button', { name: /^(Plan|Replan) my week$/ }).click();
  await expect(page.getByRole('button', { name: 'Use this plan' })).toBeVisible({
    timeout: 15_000,
  });
  const preview = await previewViaApi(request, student.accessToken);
  const day = preview.days.find((d) => d.date === blockDay);
  expect(day, 'the plan covers tomorrow').toBeTruthy();
  const byStart = (a: { startTime: string }, b: { startTime: string }) =>
    a.startTime.localeCompare(b.startTime);
  const inBlock = day!.sessions
    .filter((s) => overlaps(s.startTime, s.endTime, '09:00', '11:00'))
    .sort(byStart);
  // The block is filled (AC-E15-06 "filled first") …
  expect(inBlock.length, 'at least one session inside the study block').toBeGreaterThan(0);
  // … the tied course takes it first (D15-6 — preferred, not exclusive: BL-15-02):
  // the first session inside the block is the tied course's, and every other
  // course's session inside the block starts after the tied work there ends.
  expect(inBlock[0].assignmentId).toBe(tiedAssignment.id);
  const tiedEnd = Math.max(
    ...inBlock
      .filter((s) => s.assignmentId === tiedAssignment.id)
      .map((s) => minutesOfTime(s.endTime))
  );
  for (const s of inBlock.filter((s) => s.assignmentId !== tiedAssignment.id)) {
    expect(
      minutesOfTime(s.startTime),
      `${s.startTime} other-course session inside the block`
    ).toBeGreaterThanOrEqual(tiedEnd);
  }
  // "Before any other free time" is placement priority, not clock order: the
  // engine fills the preferred block first, then the day's remaining free
  // time (which may sit earlier on the clock) with whatever ranks next.
});

test("EP15J-AC1(d): cancelling one occurrence returns that day's free time but not next week's", async ({
  page,
  request,
}) => {
  const student = await newStudent(request, { wakeTime: '08:00', sleepTime: '22:00' });
  const block = await createScheduleBlockViaApi(request, student.accessToken, {
    kind: 'BUSY',
    title: 'Band practice',
    startDate: student.today,
    weekdays: [civilWeekday(student.today)],
    startTime: '10:00',
    endTime: '12:00',
  });
  const week = weekOf(student.today);
  const before = await getCalendarWeekViaApi(request, student.accessToken, week.from, week.to);
  expect(before.days.find((d) => d.date === student.today)!.free.map((f) => f.startTime)).toEqual([
    '08:00',
    '12:00',
  ]);

  await loginViaUi(page, student.email);
  await page.goto('/calendar');
  const chip = page.getByRole('button', { name: /Band practice/ });
  await chip.click();
  const details = page.getByRole('dialog', { name: 'Band practice' });
  await expect(details).toContainText('Weekly');
  await details.getByRole('button', { name: 'Remove' }).click();
  await expect(details).toContainText('This repeats weekly. Remove it for:');
  await details.getByRole('button', { name: 'Just this day' }).click();
  await expect(details).toHaveCount(0);
  await expect(status(page)).toContainText('Removed for this day');
  await expect(page.getByRole('button', { name: /Band practice/ })).toHaveCount(0);

  // Today is free again …
  const after = await getCalendarWeekViaApi(request, student.accessToken, week.from, week.to);
  expect(after.days.find((d) => d.date === student.today)!.free.map((f) => f.startTime)).toEqual([
    '08:00',
  ]);
  // … and next week's occurrence still stands (AC-E15-04).
  const nextDate = addCivilDays(student.today, 7);
  const next = await getCalendarWeekViaApi(request, student.accessToken, nextDate, nextDate);
  expect(next.events.filter((e) => e.blockId === block.id && e.type === 'EVENT')).toHaveLength(1);
  expect(next.days[0].free.map((f) => f.startTime)).toEqual(['08:00', '12:00']);
});

test('EP15J-AC1(e): at 375 px the agenda adds and edits a block through the same sheet', async ({
  page,
  request,
}) => {
  const student = await newStudent(request, { wakeTime: '08:00', sleepTime: '22:00' });
  await loginViaUi(page, student.email);
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto('/calendar');
  await expect(page.getByRole('list', { name: 'Week agenda' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Week view' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Add' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add to calendar' });
  await sheet.getByLabel('Title (optional)').fill('Dentist');
  await sheet.getByLabel('Start').fill('13:00');
  await sheet.getByLabel('End').fill('14:00');
  // Bottom-sheet ergonomics (D-G7): Save is ≥ 44 px tall. Let the dialog's
  // entrance scale finish first — a mid-animation box reads 0.95 × its size.
  const save = sheet.getByRole('button', { name: 'Save' });
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState === 'finished' || a.playState === 'idle')
  );
  expect(((await save.boundingBox())?.height ?? 0) >= 44).toBe(true);
  await save.click();
  await expect(sheet).toHaveCount(0);
  await expect(status(page)).toContainText('Busy added');

  const entry = page.getByRole('button', { name: /Dentist/ });
  await expect(entry).toBeVisible();
  await entry.click();
  const details = page.getByRole('dialog', { name: 'Dentist' });
  await details.getByRole('button', { name: 'Edit' }).click();
  const edit = page.getByRole('dialog', { name: 'Edit Dentist' });
  await expect(edit).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1); // one dialog at a time
  await expect(edit.getByRole('radiogroup')).toHaveCount(0); // kind is immutable (D-B1)
  await edit.getByLabel('Title (optional)').fill('Dentist visit');
  await edit.getByLabel('End').fill('14:30');
  await edit.getByRole('button', { name: 'Save' }).click();
  await expect(edit).toHaveCount(0);
  await expect(status(page)).toContainText('Busy updated');
  await expect(
    page.getByRole('button', { name: /Dentist visit.*13:00–14:30|13:00–14:30.*Dentist visit/ })
  ).toBeVisible();

  // No horizontal scrolling at 375 px with the new entry present.
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test('EP15J-AC1(f): drag-selecting free cells on the grid opens the pre-filled sheet and saving creates the block', async ({
  page,
  request,
}) => {
  const student = await newStudent(request, { wakeTime: '08:00', sleepTime: '22:00' });
  await loginViaUi(page, student.email);
  // Tall enough that the whole hour grid (17 h × 60 px) sits inside the
  // viewport: page.mouse needs its target points on screen.
  await page.setViewportSize({ width: 1280, height: 1800 });
  await page.goto('/calendar');
  await expect(page.getByRole('list', { name: 'Week view' })).toBeVisible();

  const column = page.locator(`[data-day="${student.today}"]`);
  await column.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  const box = (await column.boundingBox())!;
  expect(box.y + 450, 'drag target points are inside the viewport').toBeLessThan(1800);
  // 08:00–22:00 bounds → the visible range starts at 07:00: 13:00 is 360 px down, 14:30 is 450 px.
  const x = box.x + box.width / 2;
  await page.mouse.move(x, box.y + 360);
  await page.mouse.down();
  await page.mouse.move(x, box.y + 400, { steps: 4 });
  await expect(page.getByTestId('drag-preview')).toContainText('13:00 –');
  await page.mouse.move(x, box.y + 450, { steps: 4 });
  await expect(page.getByTestId('drag-preview')).toContainText('13:00 – 14:30');
  await page.mouse.up();

  const sheet = page.getByRole('dialog', { name: 'Add to calendar' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel('Date')).toHaveValue(student.today);
  await expect(sheet.getByLabel('Start')).toHaveValue('13:00');
  await expect(sheet.getByLabel('End')).toHaveValue('14:30');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(status(page)).toContainText('Busy added');
  await expect(page.getByRole('button', { name: /^Busy\W*13:00–14:30/ })).toBeVisible();

  const cal = await getCalendarWeekViaApi(
    request,
    student.accessToken,
    student.today,
    student.today
  );
  expect(
    cal.events.filter((e) => e.type === 'EVENT').map((e) => `${e.startTime}-${e.endTime}`)
  ).toEqual(['13:00-14:30']);
});

test('EP15J-AC2: the axe gate passes on the grid, the details dialog, the bounds sheet and the block sheet (no allowlist)', async ({
  page,
  request,
}) => {
  const student = await newStudent(request, { wakeTime: '08:00', sleepTime: '22:00' });
  const course = await createCourseViaApi(request, student.accessToken, {
    code: `AXE-${uniq().slice(-6)}`,
    name: `Axe Course ${uniq()}`,
  });
  await createScheduleBlockViaApi(request, student.accessToken, {
    kind: 'BUSY',
    title: 'Commute',
    startDate: student.today,
    weekdays: [civilWeekday(student.today)],
    startTime: '08:00',
    endTime: '09:00',
  });
  await createScheduleBlockViaApi(request, student.accessToken, {
    kind: 'STUDY',
    courseId: course.id,
    energy: 'HIGH',
    startDate: student.today,
    startTime: '14:00',
    endTime: '16:00',
  });
  await loginViaUi(page, student.email);
  await page.goto('/calendar');
  await expect(page.getByRole('list', { name: 'Week view' })).toBeVisible();
  await expectNoAxeViolations(page, '/calendar (grid with event + study block)');

  await page.getByRole('button', { name: /Commute/ }).click();
  await expect(page.getByRole('dialog', { name: 'Commute' })).toBeVisible();
  await expectNoAxeViolations(page, 'details dialog (weekly event)');
  await page.keyboard.press('Escape');

  await page
    .getByRole('button', { name: /^Day starts 08:00/ })
    .first()
    .click();
  await expect(
    page.getByRole('dialog', { name: 'When does your day start and end?' })
  ).toBeVisible();
  await expectNoAxeViolations(page, 'day-bounds sheet');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Add' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add to calendar' });
  await expectNoAxeViolations(page, 'block sheet (Busy, one-off)');
  await sheet.getByRole('radio', { name: 'Study' }).check();
  await sheet.getByRole('switch', { name: 'Repeats weekly' }).click();
  await sheet.getByRole('button', { name: 'More' }).click();
  await expect(sheet.getByLabel('Energy')).toBeVisible();
  await expectNoAxeViolations(page, 'block sheet (Study, weekly, More expanded)');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
});
