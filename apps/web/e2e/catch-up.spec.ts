import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  authHeaders,
  createAssignmentViaApi,
  createAuthenticatedUserViaApi,
  createAvailabilitySlotViaApi,
  loginViaUi,
} from './helpers';

/**
 * EP08F — cross-layer E2E for the whole catch-up & recovery flow (TR-E08-07)
 * against the self-contained EP09 stack, plus the durable narrow-viewport and
 * keyboard evidence for TR-E08-08 on the EP08D/EP08E surfaces.
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
  for (let d = 0; d < 7; d++) {
    await createAvailabilitySlotViaApi(request, accessToken, {
      dayOfWeek: d,
      startTime: availability.startTime,
      endTime: availability.endTime,
      isAvailable: true,
    });
  }
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

  const summaryBefore = await getRecoverySummary(request, user.accessToken);
  expect(summaryBefore.missedCount).toBe(3);
  const essayBefore = await assignmentSnapshot(request, user.accessToken, essay.id);
  const readingBefore = await assignmentSnapshot(request, user.accessToken, reading.id);

  await loginViaUi(page, user.email);
  await savePreferencesViaUi(page);

  // AC 1a — the recovery summary surfaces the missed sessions.
  await page.goto('/catch-up');
  await expect(page.getByRole('heading', { name: 'Catch up' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Missed sessions' })).toBeVisible();
  await expect(page.getByText(essay.title).first()).toBeVisible();
  await expect(page.getByText(addDays(user.today, -2)).first()).toBeVisible();

  // AC 1b — manual entry point → preview; assert against the server window.
  const [previewRes] = await Promise.all([
    waitForPreviewResponse(page),
    page.getByRole('button', { name: 'Create catch-up plan' }).click(),
  ]);
  await expect(page).toHaveURL(/\/catch-up\/preview/);
  const preview = (await previewRes.json()) as CatchUpPreviewResponse;
  expect(preview.from).toBe(user.today);
  expect(preview.to).toBe(user.to);
  expect(preview.missedSessions).toHaveLength(3);

  await expect(page.getByTestId('plan-week')).toBeVisible();
  const proposed = flattenProposed(preview);
  expect(proposed.length).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole('button', { name: /move later 15 minutes/i })).toHaveCount(
    proposed.length
  );

  // AC 1c — edit: move the first proposal 15 minutes later, delete the last.
  const edited = [...proposed];
  edited[0] = {
    ...edited[0],
    startTime: toHHmm(minutesOf(edited[0].startTime) + 15),
    endTime: toHHmm(minutesOf(edited[0].endTime) + 15),
  };
  edited.pop();
  await page
    .getByRole('button', { name: /move later 15 minutes/i })
    .first()
    .click();
  await page
    .getByRole('button', { name: /delete session/i })
    .last()
    .click();

  // AC 1d — confirm.
  await page.getByRole('button', { name: 'Use this plan' }).click();
  await expect(page.getByText('Catch-up plan saved.')).toBeVisible();
  await expect(page).toHaveURL(/\/catch-up$/);

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
  expect(summaryAfter.missedCount).toBe(3);
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
  await page.goto('/catch-up');
  const [previewRes] = await Promise.all([
    waitForPreviewResponse(page),
    page.getByRole('button', { name: 'Create catch-up plan' }).click(),
  ]);
  const preview = (await previewRes.json()) as CatchUpPreviewResponse;
  await expect(page.getByRole('button', { name: 'Use this plan' })).toBeVisible();
  expect(preview.from).toBe(user.today); // the preview really generated server-side

  // Decline = "Not now": client-side only (V-08-4) — no confirm request.
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page).toHaveURL(/\/catch-up$/);
  expect(confirmCalls).toHaveLength(0);
  await expect(page.getByRole('heading', { name: 'Missed sessions' })).toBeVisible();

  // The plan is byte-for-byte unchanged.
  const planAfter = await getPlanWindow(request, user.accessToken, user.today, user.to);
  expect(JSON.stringify(planAfter)).toBe(JSON.stringify(planBefore));
  const summaryAfter = await getRecoverySummary(request, user.accessToken);
  expect(summaryAfter.missedCount).toBe(summaryBefore.missedCount);
  expect(await assignmentSnapshot(request, user.accessToken, assignment.id)).toBe(assignmentBefore);
});

test('a locked session survives confirm unchanged (fields + count)', async ({ page, request }) => {
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

  // The preview reports the preserved locked session.
  const [previewRes] = await Promise.all([
    waitForPreviewResponse(page),
    page.goto('/catch-up/preview'),
  ]);
  await expect(page.getByRole('heading', { name: 'Catch-up plan' })).toBeVisible();
  const preview = (await previewRes.json()) as CatchUpPreviewResponse;
  expect(preview.lockedPreserved).toBe(1);
  await expect(page.getByTestId('catch-up-preservation')).toContainText(
    '1 locked session stays exactly where it is.'
  );

  // Confirm the regenerated proposal.
  await page.getByRole('button', { name: 'Use this plan' }).click();
  await expect(page.getByText('Catch-up plan saved.')).toBeVisible();

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
    page.goto('/catch-up/preview'),
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
  expect(summary.missedCount).toBe(2);
  expect(summary.missedSessions.map((m) => m.assignmentId)).toEqual([pending.id, pending.id]);
  expect(summary.unfinishedWork.map((w) => w.assignmentId)).not.toContain(done.id);

  // UI side: the completed assignment is nowhere on the recovery surface.
  await loginViaUi(page, user.email);
  await page.goto('/catch-up');
  await expect(page.getByRole('heading', { name: 'Missed sessions' })).toBeVisible();
  await expect(page.getByText(pending.title).first()).toBeVisible();
  await expect(page.getByText(done.title)).toHaveCount(0);
});

test('recorded confirmed time reaches the recovery summary', async ({ page, request }) => {
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
  await page.goto('/catch-up');
  await expect(page.getByText('45 minutes studied so far')).toBeVisible();
  await expect(page.getByText(assignment.title).first()).toBeVisible();
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
  await page.goto('/catch-up');
  await expect(page.getByRole('heading', { name: 'Catch up' })).toBeVisible();
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: /Study session/ }).first()).toBeVisible();
});

test.describe('EP08 surfaces — narrow viewport + keyboard (TR-E08-08 durable evidence)', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test('/catch-up at 320px: no horizontal overflow, 44px target, keyboard path to the replan entry', async ({
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
    await page.goto('/catch-up');
    await expect(page.getByRole('heading', { name: 'Catch up' })).toBeVisible();
    await expect(page.getByText(assignment.title).first()).toBeVisible();

    // Responsive: the page does not scroll sideways at 320px…
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);

    // …and the entry point keeps a 44px tap target (max-sm min-height).
    const entry = page.getByRole('button', { name: 'Create catch-up plan' });
    const box = await entry.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    // Keyboard: Tab from the document start reaches the entry, with the
    // shared focus-visible ring on the focused element, and Enter activates.
    const walk = await tabUntil(page, /create catch-up plan/i);
    expect(walk.found, `Tab path: ${walk.path.join(' → ')}`).toBe(true);
    const ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return getComputedStyle(el).boxShadow;
    });
    expect(ring).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/catch-up\/preview/);
  });

  test('/catch-up/preview at 320px: controls stack and stay tappable; the lock toggle is operable', async ({
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
      page.goto('/catch-up/preview'),
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
    const missed = summary.missedSessions.find((m) => m.id === missedRowId);
    expect(missed?.locked).toBe(false);
  });
});
