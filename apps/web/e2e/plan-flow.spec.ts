import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  authHeaders,
  axeViolations,
  civilWeekday,
  createAssignmentViaApi,
  createAuthenticatedUserViaApi,
  createCourseViaApi,
  createSemesterViaApi,
  setDayBoundsViaApi,
  loginViaUi,
} from './helpers';

/**
 * EP16F — the single plan flow end to end (TR-E16-03; AC-E16-06/07/08),
 * rewritten from EP08F's `catch-up.spec.ts` (D-F1): `/plan` → **Plan /
 * Replan my week** → `/plan/proposal` → **Use this plan** / **Not now**, with
 * locks, conflicts, warnings, the retired-route redirect matrix (V-16-2) and
 * the durable narrow-viewport + keyboard evidence (TR-E08-08 → TR-E16-04).
 * The EP08F test ids are preserved where their surface survives:
 * `catch-up-preservation`, and `plan-week` on /plan. On /plan/proposal the
 * week is EP17E's single `editable-week` (the old `plan-session-editor` list
 * is gone); edits happen in the in-place panel a session card opens.
 *
 * Date-fixture discipline (EP06H lesson): the browser and this test process
 * never compute "today" from the wall clock. The window is read from the
 * server (`GET /api/study-plans` for a plan-less user returns
 * `from = server civil today`, `to = from + 6`) and every fixture date is
 * derived from that string. Assertions compare against the window the server
 * returned (`from`/`to`), never against browser dates.
 *
 * Missed sessions are seeded through the real API: `POST /api/study-plans`
 * accepts `from >= today - 6` (the window-rollover tolerance), so rows placed
 * on days strictly before the server "today" are genuine past SCHEDULED
 * sessions — no direct-database back door, no feature-code change.
 */

test.describe.configure({ mode: 'serial' });

const uniqueSuffix = () => `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

/** Civil-date arithmetic on the server-returned `YYYY-MM-DD` strings only. */
function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toHHmm(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** What `createCatchUpUser` resolves: identity + the SERVER-computed window. */
interface CatchUpUser {
  email: string;
  accessToken: string;
  /** Server civil "today" (`GET /api/study-plans` → `from`). */
  today: string;
  /** Server window end (`today + 6`). */
  to: string;
}

/**
 * Fresh student with availability on every day of the week and the
 * server-computed planning window captured BEFORE any fixture row exists —
 * that `from` is the only "today" this file ever uses.
 */
async function createCatchUpUser(
  request: APIRequestContext,
  availability: { startTime: string; endTime: string } = { startTime: '08:00', endTime: '20:00' }
): Promise<CatchUpUser> {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);
  await setDayBoundsViaApi(request, accessToken, {
    wakeTime: availability.startTime,
    sleepTime: availability.endTime,
  });
  const winRes = await request.get('/api/study-plans', { headers: authHeaders(accessToken) });
  expect(winRes.status()).toBe(200);
  const win = (await winRes.json()) as { from: string; to: string };
  return { email, accessToken, today: win.from, to: win.to };
}

interface SeedSession {
  assignmentId: string;
  date: string;
  startTime: string;
  endTime: string;
}

/** The saved-plan row shape (`GET`/`POST /api/study-plans`). */
interface SavedRow {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
}
interface SavedPlanResponse {
  from: string;
  to: string;
  timeZone: string;
  days: { date: string; targetMinutes: number; sessions: SavedRow[] }[];
}

/** `POST /api/study-plans` — the EP06D save, used here as the API-side seeder. */
async function savePlanViaApi(
  request: APIRequestContext,
  accessToken: string,
  from: string,
  sessions: SeedSession[]
): Promise<SavedPlanResponse> {
  const res = await request.post('/api/study-plans', {
    headers: authHeaders(accessToken),
    data: { from, to: addDays(from, 6), sessions },
  });
  expect(res.status()).toBe(201);
  return (await res.json()) as SavedPlanResponse;
}

/**
 * Seed missed sessions: save a plan week anchored six days back (inside the
 * API's rollover tolerance) with rows on the named past days. Those rows are
 * SCHEDULED on dates strictly before the server "today" — i.e. missed — and
 * leave the current `[today, today+6]` window untouched.
 */
async function seedMissedViaApi(
  request: APIRequestContext,
  accessToken: string,
  today: string,
  sessions: SeedSession[]
): Promise<SavedPlanResponse> {
  return savePlanViaApi(request, accessToken, addDays(today, -6), sessions);
}

async function getPlanWindow(
  request: APIRequestContext,
  accessToken: string,
  from: string,
  to: string
): Promise<SavedPlanResponse> {
  const res = await request.get(`/api/study-plans?from=${from}&to=${to}`, {
    headers: authHeaders(accessToken),
  });
  expect(res.status()).toBe(200);
  return (await res.json()) as SavedPlanResponse;
}

function flattenSaved(plan: SavedPlanResponse) {
  return plan.days.flatMap((d) => d.sessions.map((s) => ({ ...s, date: d.date })));
}

const rowKey = (s: { assignmentId: string; date: string; startTime: string; endTime: string }) =>
  `${s.assignmentId}|${s.date}|${s.startTime}|${s.endTime}`;

interface RecoverySummaryResponse {
  missedSessions: {
    id: string;
    assignmentId: string;
    assignmentTitle: string;
    date: string;
    locked: boolean;
  }[];
  missedCount: number;
  rolledForwardCount: number;
  rolledForward: Array<{ id: string; assignmentId: string; locked: boolean }>;
  unfinishedWork: { assignmentId: string }[];
  confirmedMinutes: number;
  message: string;
}

async function getRecoverySummary(
  request: APIRequestContext,
  accessToken: string
): Promise<RecoverySummaryResponse> {
  const res = await request.get('/api/study-plans/recovery-summary', {
    headers: authHeaders(accessToken),
  });
  expect(res.status()).toBe(200);
  return (await res.json()) as RecoverySummaryResponse;
}

/** Field-for-field snapshot of one assignment row (AC-E08-03/08 immutability). */
async function assignmentSnapshot(
  request: APIRequestContext,
  accessToken: string,
  assignmentId: string
): Promise<string> {
  const res = await request.get('/api/assignments', { headers: authHeaders(accessToken) });
  expect(res.status()).toBe(200);
  const list = (await res.json()) as Record<string, unknown>[];
  const row = list.find((r) => r.id === assignmentId);
  expect(row).toBeTruthy();
  return JSON.stringify(row);
}

/** The catch-up preview payload shape (only the fields this file asserts). */
interface CatchUpPreviewResponse {
  from: string;
  to: string;
  days: {
    date: string;
    sessions: {
      assignmentId: string;
      assignmentTitle: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
    }[];
  }[];
  warnings: { assignmentId: string; category: string; minutes: number; dueDate: string | null }[];
  missedSessions: { id: string; locked: boolean }[];
  lockedPreserved: number;
  completedPreserved: number;
}

function flattenProposed(preview: CatchUpPreviewResponse) {
  return preview.days.flatMap((d) => d.sessions.map((s) => ({ ...s, date: d.date })));
}

/** Resolve once the app's own preview POST answers, so assertions run on the
 * window and proposals the SERVER returned. */
function waitForPreviewResponse(page: Page) {
  return page.waitForResponse(
    (r) => r.url().includes('/api/study-plans/catch-up/preview') && r.status() === 200
  );
}

/** Save the default study preferences through the real profile page (EP06 pattern). */
async function savePreferencesViaUi(page: Page): Promise<void> {
  await page.goto('/profile');
  await page.getByRole('button', { name: /save study preferences/i }).click();
  await expect(page.getByText('Study preferences saved.')).toBeVisible();
}

/**
 * Walk the real Tab order until the focused element matches `label`. Returns
 * the visited focus path so a failure names the stop where navigation
 * stalled. The match is computed on `RegExp.test` with a fresh regex per
 * stop (no sticky/global state) and returned as a separate field — never
 * encoded into the label string.
 */
async function tabUntil(
  page: Page,
  label: RegExp,
  maxTabs = 40
): Promise<{ found: boolean; path: string[] }> {
  const path: string[] = [];
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return { desc: '<none>', text: '' };
      const text = `${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`.trim();
      return { desc: `${el.tagName.toLowerCase()}${text ? `:${text.slice(0, 48)}` : ''}`, text };
    });
    path.push(stop.desc);
    // The match is computed in Node — the returned strings are plain here
    // and RegExp semantics are guaranteed across the CDP boundary.
    if (new RegExp(label.source, label.flags).test(stop.text)) return { found: true, path };
  }
  return { found: false, path };
}

/** The axe gate: no serious/critical WCAG A/AA violation, no allowlist. */
async function expectNoAxeViolations(page: Page, surface: string): Promise<void> {
  const violations = await axeViolations(page);
  expect(violations, `axe on ${surface}:\n${violations.join('\n')}`).toEqual([]);
}

test('journey: missed sessions → preview → edit → confirm → the saved plan survives a reload', async ({
  page,
  request,
}) => {
  const user = await createCatchUpUser(request);
  const due = `${addDays(user.to, -1)}T12:00:00.000Z`; // inside the server window
  const essay = await createAssignmentViaApi(request, user.accessToken, {
    title: `Essay ${uniqueSuffix()}`,
    dueDate: due,
    estimatedHours: 1,
    priority: 'HIGH',
  });
  const reading = await createAssignmentViaApi(request, user.accessToken, {
    title: `Reading ${uniqueSuffix()}`,
    dueDate: due,
    estimatedHours: 1,
    priority: 'MEDIUM',
  });

  // Three missed sessions on the two days before the server "today".
  await seedMissedViaApi(request, user.accessToken, user.today, [
    { assignmentId: essay.id, date: addDays(user.today, -2), startTime: '10:00', endTime: '11:00' },
    { assignmentId: essay.id, date: addDays(user.today, -1), startTime: '14:00', endTime: '15:00' },
    {
      assignmentId: reading.id,
      date: addDays(user.today, -1),
      startTime: '16:00',
      endTime: '17:00',
    },
  ]);

  // EP13C (D13-2, AC-E13-04): the summary read reconciles first — unstarted
  // past sessions roll forward and stop being "missed".
  const summaryBefore = await getRecoverySummary(request, user.accessToken);
  expect(summaryBefore.missedCount).toBe(0);
  expect(summaryBefore.rolledForwardCount).toBe(3);
  const essayBefore = await assignmentSnapshot(request, user.accessToken, essay.id);
  const readingBefore = await assignmentSnapshot(request, user.accessToken, reading.id);

  await loginViaUi(page, user.email);
  await savePreferencesViaUi(page);

  // AC 1a — EP16C: the proposal surface shows the moved-forward sessions as context.
  const [previewRes] = await Promise.all([
    waitForPreviewResponse(page),
    page.goto('/plan/proposal'),
  ]);
  await expect(page).toHaveURL(/\/plan\/proposal$/);
  await expect(page.getByRole('heading', { name: 'Your proposed week' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Moved forward into this plan' })).toBeVisible();
  await expect(page.getByText(essay.title).first()).toBeVisible();
  await expect(page.getByText(addDays(user.today, -2)).first()).toBeVisible();
  await expectNoAxeViolations(page, '/plan/proposal (moved forward)');

  // AC 1b — assert against the server window.
  const preview = (await previewRes.json()) as CatchUpPreviewResponse;
  expect(preview.from).toBe(user.today);
  expect(preview.to).toBe(user.to);
  expect(preview.missedSessions).toHaveLength(3);

  await expect(page.getByTestId('editable-week')).toBeVisible();
  const proposed = flattenProposed(preview);
  expect(proposed.length).toBeGreaterThanOrEqual(2);
  // EP17E: one card per proposed session; the edit controls live in the one
  // in-place panel an open card shows.
  const sessionCards = page.getByTestId('editable-week').locator('article');
  await expect(sessionCards).toHaveCount(proposed.length);

  // AC 1c — edit: move the first proposal 15 minutes later, delete the last.
  const edited = [...proposed];
  edited[0] = {
    ...edited[0],
    startTime: toHHmm(minutesOf(edited[0].startTime) + 15),
    endTime: toHHmm(minutesOf(edited[0].endTime) + 15),
  };
  edited.pop();
  await sessionCards.first().locator('button').first().click();
  await page.getByRole('button', { name: /move later 15 minutes/i }).click();
  await sessionCards.last().locator('button').first().click();
  await page.getByRole('button', { name: /delete session/i }).click();

  // AC 1d — confirm.
  await page.getByRole('button', { name: 'Use this plan' }).click();
  await expect(page.getByText('Plan saved.')).toBeVisible();
  await expect(page).toHaveURL(/\/today$/);

  // AC 1e — reload survival: the plan page re-reads the saved plan from the
  // server after a full reload.
  await page.goto('/plan');
  await expect(page.getByTestId('plan-week')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('plan-week').getByText(essay.title).first()).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('plan-week')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('plan-week').getByText(essay.title).first()).toBeVisible();

  // AC 1f — the server-side rows are exactly the EDITED proposal set.
  const saved = await getPlanWindow(request, user.accessToken, preview.from, preview.to);
  expect(flattenSaved(saved).map(rowKey).sort()).toEqual(edited.map(rowKey).sort());

  // AC-E08-03/08 — confirm wrote only current-window plan rows: the past rows
  // are still the same missed sessions, assignments are field-for-field
  // unchanged, and no study log was written.
  const summaryAfter = await getRecoverySummary(request, user.accessToken);
  expect(summaryAfter.missedCount).toBe(0);
  expect(summaryAfter.rolledForwardCount).toBe(3);
  expect(await assignmentSnapshot(request, user.accessToken, essay.id)).toBe(essayBefore);
  expect(await assignmentSnapshot(request, user.accessToken, reading.id)).toBe(readingBefore);
  const sessionList = await request.get('/api/study-sessions', {
    headers: authHeaders(user.accessToken),
  });
  expect(sessionList.status()).toBe(200);
  expect(((await sessionList.json()) as { items: unknown[] }).items).toHaveLength(0);
});

test('decline leaves the plan unchanged (no confirm call, no persisted mutation)', async ({
  page,
  request,
}) => {
  const user = await createCatchUpUser(request);
  const assignment = await createAssignmentViaApi(request, user.accessToken, {
    title: `Decline ${uniqueSuffix()}`,
    dueDate: `${addDays(user.today, 4)}T12:00:00.000Z`,
    estimatedHours: 1,
  });
  await seedMissedViaApi(request, user.accessToken, user.today, [
    {
      assignmentId: assignment.id,
      date: addDays(user.today, -2),
      startTime: '10:00',
      endTime: '11:00',
    },
    {
      assignmentId: assignment.id,
      date: addDays(user.today, -1),
      startTime: '13:00',
      endTime: '14:00',
    },
  ]);

  // The full current-window plan state + recovery summary before the flow.
  const planBefore = await getPlanWindow(request, user.accessToken, user.today, user.to);
  const summaryBefore = await getRecoverySummary(request, user.accessToken);
  const assignmentBefore = await assignmentSnapshot(request, user.accessToken, assignment.id);

  const confirmCalls: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/study-plans/catch-up/confirm')) confirmCalls.push(r.url());
  });

  await loginViaUi(page, user.email);
  await savePreferencesViaUi(page);
  await page.goto('/plan');
  const [previewRes] = await Promise.all([
    waitForPreviewResponse(page),
    page.getByRole('button', { name: /^(Plan|Replan) my week$/ }).click(),
  ]);
  const preview = (await previewRes.json()) as CatchUpPreviewResponse;
  await expect(page.getByRole('button', { name: 'Use this plan' })).toBeVisible();
  expect(preview.from).toBe(user.today); // the preview really generated server-side

  // Decline = "Not now": client-side only (V-08-4) — no confirm request.
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  expect(confirmCalls).toHaveLength(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Plan' })).toBeVisible();

  // The plan is byte-for-byte unchanged.
  const planAfter = await getPlanWindow(request, user.accessToken, user.today, user.to);
  expect(JSON.stringify(planAfter)).toBe(JSON.stringify(planBefore));
  const summaryAfter = await getRecoverySummary(request, user.accessToken);
  expect(summaryAfter.missedCount).toBe(summaryBefore.missedCount);
  expect(await assignmentSnapshot(request, user.accessToken, assignment.id)).toBe(assignmentBefore);
});

test('lock a session → Replan my week → What this plan keeps lists it → Use this plan → the locked session survives (AC-E16-06)', async ({
  page,
  request,
}) => {
  const user = await createCatchUpUser(request);
  const assignment = await createAssignmentViaApi(request, user.accessToken, {
    title: `Locked ${uniqueSuffix()}`,
    dueDate: `${addDays(user.today, 5)}T12:00:00.000Z`,
    estimatedHours: 1,
  });

  // A session INSIDE the confirm window [today, today+6] — the only range the
  // confirm transaction deletes — locked through the real EP08E toggle endpoint.
  const saved = await savePlanViaApi(request, user.accessToken, user.today, [
    { assignmentId: assignment.id, date: user.today, startTime: '09:00', endTime: '10:00' },
  ]);
  const lockedRow = saved.days[0].sessions[0];
  expect(lockedRow).toBeTruthy();
  const lockRes = await request.patch(`/api/study-plans/sessions/${lockedRow.id}/lock`, {
    headers: authHeaders(user.accessToken),
    data: { locked: true },
  });
  expect(lockRes.status()).toBe(200);
  expect(await lockRes.json()).toEqual({ id: lockedRow.id, locked: true });

  const lockedFieldsBefore = JSON.stringify({
    assignmentId: lockedRow.assignmentId,
    startTime: lockedRow.startTime,
    endTime: lockedRow.endTime,
    durationMinutes: lockedRow.durationMinutes,
    status: lockedRow.status,
  });

  await loginViaUi(page, user.email);
  await savePreferencesViaUi(page);

  // /plan shows the saved week and offers Replan (a saved session exists).
  await page.goto('/plan');
  await expect(page.getByRole('heading', { level: 1, name: 'Plan' })).toBeVisible();
  await expect(page.getByTestId('plan-week').getByText(assignment.title).first()).toBeVisible({
    timeout: 15_000,
  });
  await expectNoAxeViolations(page, '/plan (saved week)');
  const [previewRes] = await Promise.all([
    waitForPreviewResponse(page),
    page.getByRole('button', { name: 'Replan my week' }).click(),
  ]);
  await expect(page).toHaveURL(/\/plan\/proposal$/);
  await expect(page.getByRole('heading', { name: 'Your proposed week' })).toBeVisible();

  // The preview reports the preserved locked session, and the surface says so.
  const preview = (await previewRes.json()) as CatchUpPreviewResponse;
  expect(preview.lockedPreserved).toBe(1);
  await expect(page.getByRole('heading', { name: 'What this plan keeps' })).toBeVisible();
  await expect(page.getByTestId('catch-up-preservation')).toContainText(
    '1 locked session stays exactly where it is.'
  );
  await expectNoAxeViolations(page, '/plan/proposal (locked kept)');

  // Confirm the regenerated proposal.
  await page.getByRole('button', { name: 'Use this plan' }).click();
  await expect(page.getByText('Plan saved.')).toBeVisible();

  // AC 3 — the locked row survives confirm field-for-field, exactly once, and
  // no proposed session was placed on top of it.
  const after = await getPlanWindow(request, user.accessToken, preview.from, preview.to);
  const rows = flattenSaved(after);
  const lockedAfter = rows.filter((r) => r.id === lockedRow.id);
  expect(lockedAfter).toHaveLength(1);
  expect(
    JSON.stringify({
      assignmentId: lockedAfter[0].assignmentId,
      startTime: lockedAfter[0].startTime,
      endTime: lockedAfter[0].endTime,
      durationMinutes: lockedAfter[0].durationMinutes,
      status: lockedAfter[0].status,
    })
  ).toBe(lockedFieldsBefore);
  const proposedCount = flattenProposed(preview).length;
  expect(rows).toHaveLength(1 + proposedCount);
  const overlapping = rows.filter(
    (r) =>
      r.id !== lockedRow.id &&
      r.date === user.today &&
      minutesOf(r.startTime) < minutesOf('10:00') &&
      minutesOf(r.endTime) > minutesOf('09:00')
  );
  expect(overlapping).toHaveLength(0);
});

test('feasibility warning is displayed when work cannot fit before its deadline', async ({
  page,
  request,
}) => {
  // Only one available hour per day against ten hours of work due in two days.
  const user = await createCatchUpUser(request, { startTime: '08:00', endTime: '09:00' });
  const dueCivil = addDays(user.today, 2);
  const big = await createAssignmentViaApi(request, user.accessToken, {
    title: `Big ${uniqueSuffix()}`,
    dueDate: `${dueCivil}T12:00:00.000Z`,
    estimatedHours: 10,
    priority: 'HIGH',
  });
  await seedMissedViaApi(request, user.accessToken, user.today, [
    { assignmentId: big.id, date: addDays(user.today, -1), startTime: '10:00', endTime: '11:00' },
  ]);
  const assignmentBefore = await assignmentSnapshot(request, user.accessToken, big.id);

  await loginViaUi(page, user.email);
  await savePreferencesViaUi(page);
  const [previewRes] = await Promise.all([
    waitForPreviewResponse(page),
    page.goto('/plan/proposal'),
  ]);
  const preview = (await previewRes.json()) as CatchUpPreviewResponse;

  // The server reports the infeasible work…
  const warning = preview.warnings.find((w) => w.assignmentId === big.id);
  expect(warning).toBeTruthy();
  expect(['NO_AVAILABLE_TIME', 'INSUFFICIENT_TIME_BEFORE_DEADLINE']).toContain(warning!.category);
  expect(warning!.minutes).toBeGreaterThan(0);
  expect(warning!.dueDate).toBe(dueCivil);

  // …and the UI displays it (same WorkloadWarnings surface as EP06).
  await expect(page.getByRole('heading', { name: 'Workload warnings' })).toBeVisible();
  await expect(page.getByText(`"${big.title}"`)).toBeVisible();
  await expect(page.getByText(/do not fit before its .* deadline/)).toBeVisible();
  await expect(page.getByText(`due ${dueCivil}`)).toBeVisible();

  // Displaying the warning never touches the deadline (AC-E08-08).
  expect(await assignmentSnapshot(request, user.accessToken, big.id)).toBe(assignmentBefore);
});

test("a completed assignment's planned sessions are not reported as missed", async ({
  page,
  request,
}) => {
  const user = await createCatchUpUser(request);
  const due = `${addDays(user.today, 3)}T12:00:00.000Z`;
  const pending = await createAssignmentViaApi(request, user.accessToken, {
    title: `Pending ${uniqueSuffix()}`,
    dueDate: due,
    estimatedHours: 1,
  });
  const done = await createAssignmentViaApi(request, user.accessToken, {
    title: `Done ${uniqueSuffix()}`,
    dueDate: due,
    estimatedHours: 1,
  });

  // Two missed rows per assignment in the past window, THEN the assignment
  // transitions to COMPLETED through the real API.
  await seedMissedViaApi(request, user.accessToken, user.today, [
    {
      assignmentId: pending.id,
      date: addDays(user.today, -3),
      startTime: '09:00',
      endTime: '10:00',
    },
    {
      assignmentId: pending.id,
      date: addDays(user.today, -2),
      startTime: '09:00',
      endTime: '10:00',
    },
    { assignmentId: done.id, date: addDays(user.today, -3), startTime: '11:00', endTime: '12:00' },
    { assignmentId: done.id, date: addDays(user.today, -1), startTime: '11:00', endTime: '12:00' },
  ]);
  const completeRes = await request.patch(`/api/assignments/${done.id}`, {
    headers: authHeaders(user.accessToken),
    data: { status: 'COMPLETED' },
  });
  expect(completeRes.status()).toBe(200);

  // Server side: only the pending assignment's rows are missed (AC 5).
  const summary = await getRecoverySummary(request, user.accessToken);
  // EP13C: the rows roll forward instead of accumulating as missed; a
  // finished assignment's rolled rows drop out of the detail.
  expect(summary.missedCount).toBe(0);
  expect(summary.rolledForward.map((m) => m.assignmentId)).toEqual([pending.id, pending.id]);
  expect(summary.unfinishedWork.map((w) => w.assignmentId)).not.toContain(done.id);

  // UI side: the completed assignment is nowhere on the proposal's moved-forward list.
  await loginViaUi(page, user.email);
  await page.goto('/plan/proposal');
  await expect(page.getByRole('heading', { name: 'Moved forward into this plan' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(pending.title).first()).toBeVisible();
  await expect(page.getByText(done.title)).toHaveCount(0);
});

// EP16C (A-C4, D-C10) → EP16F: the plan-health total is gone; the recorded
// time now surfaces on /plan's Remaining work as the assignment's Confirmed minutes.
test('recorded confirmed time reaches the recovery summary and Remaining work on /plan', async ({
  page,
  request,
}) => {
  const user = await createCatchUpUser(request);
  const assignment = await createAssignmentViaApi(request, user.accessToken, {
    title: `Focus ${uniqueSuffix()}`,
    dueDate: `${addDays(user.today, 4)}T12:00:00.000Z`,
    estimatedHours: 2,
  });
  await seedMissedViaApi(request, user.accessToken, user.today, [
    {
      assignmentId: assignment.id,
      date: addDays(user.today, -1),
      startTime: '10:00',
      endTime: '11:00',
    },
  ]);

  // Record confirmed time through the real EP07 flow (open → finish 45).
  const openRes = await request.post('/api/study-sessions', {
    headers: authHeaders(user.accessToken),
    data: { assignmentId: assignment.id, plannedMinutes: 25 },
  });
  expect(openRes.status()).toBe(201);
  const opened = (await openRes.json()) as { id: string };
  const finishRes = await request.post(`/api/study-sessions/${opened.id}/finish`, {
    headers: authHeaders(user.accessToken),
    data: { confirmedMinutes: 45 },
  });
  expect(finishRes.status()).toBe(200);

  // AC 6 — the total reaches the recovery summary (API + UI line).
  const summary = await getRecoverySummary(request, user.accessToken);
  expect(summary.confirmedMinutes).toBe(45);

  await loginViaUi(page, user.email);
  await page.goto('/plan');
  const remaining = page.getByRole('region', { name: /^Remaining work/ });
  await expect(remaining.getByText(assignment.title).first()).toBeVisible({ timeout: 15_000 });
  await expect(remaining.getByText(/Confirmed\s*45 min/)).toBeVisible();
  // The retired page's route lands here too (route matrix).
  await page.goto('/plan/health');
  await expect(page).toHaveURL(/\/plan$/);
});

test('route matrix: every retired plan-health and catch-up route redirects (AC-E16-08, V-16-2)', async ({
  page,
  request,
}) => {
  const user = await createCatchUpUser(request);
  await loginViaUi(page, user.email);
  const matrix: [string, RegExp][] = [
    ['/plan/health', /\/plan$/],
    ['/plan/health/catch-up', /\/plan\/proposal$/],
    ['/catch-up', /\/plan$/],
    ['/catch-up/preview', /\/plan\/proposal$/],
  ];
  for (const [from, to] of matrix) {
    await page.goto(from);
    await expect(page, `${from} redirects`).toHaveURL(to);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  }
  // Signed out, the same routes land on /login (protected group).
  await page.context().clearCookies();
  await page.goto('/plan/health');
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
});

test('a 409 on Use this plan marks the clashing rows and keeps the edits (AC-E16-06, D-C11)', async ({
  page,
  request,
}) => {
  const user = await createCatchUpUser(request);
  const semester = await createSemesterViaApi(request, user.accessToken, {
    name: `E2E Semester ${uniqueSuffix()}`,
    startDate: '2026-01-05',
    endDate: '2026-05-15',
  });
  const course = await createCourseViaApi(request, user.accessToken, {
    code: `E2E-${crypto.randomUUID().slice(0, 8)}`,
    name: `E2E Course ${uniqueSuffix()}`,
    semesterId: semester.id,
  });
  const assignment = await createAssignmentViaApi(request, user.accessToken, {
    title: `Clash ${uniqueSuffix()}`,
    courseId: course.id,
    dueDate: `${addDays(user.today, 5)}T12:00:00.000Z`,
    estimatedHours: 1,
  });

  await loginViaUi(page, user.email);
  const [previewRes] = await Promise.all([
    waitForPreviewResponse(page),
    page.goto('/plan/proposal'),
  ]);
  const preview = (await previewRes.json()) as CatchUpPreviewResponse;
  const proposed = flattenProposed(preview);
  expect(proposed.length).toBeGreaterThanOrEqual(1);
  await expect(page.getByTestId('editable-week')).toBeVisible();

  // EP17E: open the first session card to reach its in-place panel.
  await page.getByTestId('editable-week').locator('article button').first().click();
  const panel = page.getByTestId('session-editor-panel');
  // A flex ("Anytime") session has no clock to collide with (EP13G), so pin
  // the first session to its suggested time first — the student's own choice.
  const pin = panel.getByRole('button', { name: /^Pin to this time/ });
  if ((await pin.count()) > 0) await pin.click();
  await expect(panel.getByRole('button', { name: /^Make flexible/ })).toBeVisible();
  const target = {
    date: await panel.getByLabel('Day').inputValue(),
    startTime: await panel.getByLabel('Start time').inputValue(),
    endTime: await panel.getByLabel('End time').inputValue(),
  };

  // A class meeting lands on that slot AFTER the proposal was built — the
  // confirm transaction must refuse it with a 409, not save it.
  const meeting = await request.post(`/api/courses/${course.id}/meetings`, {
    headers: authHeaders(user.accessToken),
    data: {
      dayOfWeek: civilWeekday(target.date),
      startTime: target.startTime,
      endTime: target.endTime,
    },
  });
  expect(meeting.status()).toBe(201);

  await page.getByRole('button', { name: 'Use this plan' }).click();

  // Reported once, inline (D-C11): the summary names the clash, the row is
  // marked, the edits stay, and nothing was saved.
  const summary = page.getByTestId('conflict-summary');
  await expect(summary).toBeVisible({ timeout: 15_000 });
  await expect(summary).toContainText('Some sessions clash with your calendar');
  await expect(summary).toContainText(target.date);
  await expect(page.locator('[data-conflicted]')).toHaveCount(1);
  await expect(page).toHaveURL(/\/plan\/proposal$/);
  await expect(page.getByText('Plan saved.')).toHaveCount(0);
  await expect(page.getByTestId('editable-week').locator('article')).toHaveCount(proposed.length);
  const saved = await getPlanWindow(request, user.accessToken, preview.from, preview.to);
  expect(flattenSaved(saved)).toHaveLength(0);
  await expectNoAxeViolations(page, '/plan/proposal (409 conflict)');
});

test('EP04 calendar regression: an in-progress (null endTime) session still renders', async ({
  page,
  request,
}) => {
  const user = await createCatchUpUser(request);
  const assignment = await createAssignmentViaApi(request, user.accessToken, {
    title: `Calendar ${uniqueSuffix()}`,
    dueDate: `${addDays(user.today, 4)}T12:00:00.000Z`,
    estimatedHours: 1,
  });
  const openRes = await request.post('/api/study-sessions', {
    headers: authHeaders(user.accessToken),
    data: { assignmentId: assignment.id, plannedMinutes: 25 },
  });
  expect(openRes.status()).toBe(201);

  await loginViaUi(page, user.email);
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: /Study session/ }).first()).toBeVisible();

  // The catch-up surface coexists with the open session; the calendar still
  // renders it afterwards.
  await page.goto('/plan');
  await expect(page.getByRole('heading', { level: 1, name: 'Plan' })).toBeVisible();
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: /Study session/ }).first()).toBeVisible();
});

test.describe('plan surfaces — narrow viewport + keyboard (TR-E08-08 → TR-E16-04 durable evidence)', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test('/plan at 320px: no horizontal overflow, 44px target, keyboard path to the replan entry', async ({
    page,
    request,
  }) => {
    const user = await createCatchUpUser(request);
    const assignment = await createAssignmentViaApi(request, user.accessToken, {
      title: `Keyboard ${uniqueSuffix()}`,
      dueDate: `${addDays(user.today, 4)}T12:00:00.000Z`,
      estimatedHours: 1,
    });
    await seedMissedViaApi(request, user.accessToken, user.today, [
      {
        assignmentId: assignment.id,
        date: addDays(user.today, -1),
        startTime: '10:00',
        endTime: '11:00',
      },
    ]);

    await loginViaUi(page, user.email);
    await page.goto('/plan');
    await expect(page.getByRole('heading', { level: 1, name: 'Plan' })).toBeVisible();
    await expect(page.getByText(assignment.title).first()).toBeVisible();

    // Responsive: the page does not scroll sideways at 320px…
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);

    // …and the entry point keeps a 44px tap target (max-sm min-height).
    const entry = page.getByRole('button', { name: /^(Plan|Replan) my week$/ });
    const box = await entry.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    // Keyboard: Tab from the document start reaches the entry, with the
    // shared focus-visible ring on the focused element, and Enter activates.
    const walk = await tabUntil(page, /^(plan|replan) my week$/i);
    expect(walk.found, `Tab path: ${walk.path.join(' → ')}`).toBe(true);
    const ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return getComputedStyle(el).boxShadow;
    });
    expect(ring).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/plan\/proposal/);
  });

  test('/plan/proposal at 320px: controls stack and stay tappable; the lock toggle is operable', async ({
    page,
    request,
  }) => {
    const user = await createCatchUpUser(request);
    const assignment = await createAssignmentViaApi(request, user.accessToken, {
      title: `Toggle ${uniqueSuffix()}`,
      dueDate: `${addDays(user.today, 4)}T12:00:00.000Z`,
      estimatedHours: 1,
    });
    const seed = await seedMissedViaApi(request, user.accessToken, user.today, [
      {
        assignmentId: assignment.id,
        date: addDays(user.today, -2),
        startTime: '09:00',
        endTime: '10:00',
      },
    ]);
    const missedRowId = seed.days[4].sessions[0].id; // days[4] === addDays(from, 4) === today-2
    const lockRes = await request.patch(`/api/study-plans/sessions/${missedRowId}/lock`, {
      headers: authHeaders(user.accessToken),
      data: { locked: true },
    });
    expect(lockRes.status()).toBe(200);

    await loginViaUi(page, user.email);
    const [previewRes] = await Promise.all([
      waitForPreviewResponse(page),
      page.goto('/plan/proposal'),
    ]);
    const preview = (await previewRes.json()) as CatchUpPreviewResponse;
    expect(preview.lockedPreserved).toBe(1);

    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);

    // Header controls stack vertically and each keeps a ≥44px target.
    const confirmBox = await page.getByRole('button', { name: 'Use this plan' }).boundingBox();
    const declineBox = await page.getByRole('button', { name: 'Not now' }).boundingBox();
    expect(confirmBox).toBeTruthy();
    expect(declineBox).toBeTruthy();
    expect(confirmBox!.height).toBeGreaterThanOrEqual(44);
    expect(declineBox!.height).toBeGreaterThanOrEqual(44);
    expect(confirmBox!.y).not.toBe(declineBox!.y); // stacked, not side-by-side

    // The explicit lock toggle (D08-4) is present, pressed, tappable, and
    // its persisted flip removes the locked session from the preview.
    const toggle = page.getByRole('button', {
      name: new RegExp(`Keep .*${assignment.title}.* locked`),
    });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const toggleBox = await toggle.boundingBox();
    expect(toggleBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await toggle.click();
    await expect(page.getByTestId('catch-up-preservation')).toHaveCount(0);

    const summary = await getRecoverySummary(request, user.accessToken);
    // EP13C (V-13-2): a locked past row rolls forward and keeps its flag.
    const rolled = summary.rolledForward.find((m) => m.id === missedRowId);
    expect(rolled?.locked).toBe(false);
  });
});
