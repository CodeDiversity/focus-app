import { expect, test } from '@playwright/test';

import {
  authHeaders,
  createAuthenticatedUserViaApi,
  createAssignmentViaApi,
  loginViaUi,
} from './helpers';

const ASSIGNMENT_TITLE_PREFIX = 'E2E Focus';

function assignmentTitle() {
  return `${ASSIGNMENT_TITLE_PREFIX} ${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
}

async function startSessionThroughUi(page: import('@playwright/test').Page, title: string) {
  await page.getByRole('button', { name: `Actions for ${title}` }).click();
  await page.getByRole('menuitem', { name: `Start focus session for ${title}` }).click();
  await expect(page.getByRole('heading', { name: 'Start a focus session' })).toBeVisible();
  await page.getByRole('button', { name: '25', exact: true }).click();
  await page.getByRole('button', { name: 'Start focus session' }).click();
  await expect(page).toHaveURL(/\/focus/);
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
}

test.describe('study sessions — cross-layer journey', () => {
  test('start → pause → resume → finish records 45 minutes and reaches history', async ({
    page,
    request,
  }) => {
    const { email, accessToken } = await createAuthenticatedUserViaApi(request);
    const title = assignmentTitle();
    await createAssignmentViaApi(request, accessToken, { title });
    await loginViaUi(page, email);
    await page.goto('/assignments');
    await expect(page.getByText(title)).toBeVisible();

    await startSessionThroughUi(page, title);

    // Pause
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    // Resume
    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

    // Finish with adjusted confirmed time
    await page.getByRole('button', { name: 'Finish session' }).click();
    await expect(page.getByRole('heading', { name: 'Finish this session' })).toBeVisible();
    const minutesInput = page.getByLabel('Minutes to record');
    await minutesInput.fill('45');
    await page.getByRole('button', { name: 'Save time' }).click();

    await expect(page.getByText('45 minutes recorded')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View study history' })).toBeVisible();

    // History surface shows the finished session
    await page.getByRole('link', { name: 'View study history' }).click();
    await expect(page).toHaveURL(/\/focus\/history/);
    await expect(page.getByRole('link', { name: title })).toBeVisible({ timeout: 10_000 });
  });

  test('reload does not complete an open session', async ({ page, request }) => {
    const { email, accessToken } = await createAuthenticatedUserViaApi(request);
    const title = assignmentTitle();
    await createAssignmentViaApi(request, accessToken, { title });
    await loginViaUi(page, email);
    await page.goto('/assignments');
    await startSessionThroughUi(page, title);

    // Capture server elapsedSeconds before reload
    const beforeRes = await request.get('/api/study-sessions/current', {
      headers: authHeaders(accessToken),
    });
    expect(beforeRes.status()).toBe(200);
    const before = (await beforeRes.json()) as { status: string; elapsedSeconds: number };
    expect(before.status).not.toBe('COMPLETED');

    await page.reload();
    await expect(page.getByRole('button', { name: 'Finish session' })).toBeVisible();

    const afterRes = await request.get('/api/study-sessions/current', {
      headers: authHeaders(accessToken),
    });
    expect(afterRes.status()).toBe(200);
    const after = (await afterRes.json()) as { status: string; elapsedSeconds: number };
    expect(after.status).not.toBe('COMPLETED');
    expect(after.elapsedSeconds).toBe(before.elapsedSeconds);

    // Timer re-anchored to the server value
    const mm = String(Math.floor(before.elapsedSeconds / 60)).padStart(2, '0');
    const ss = String(before.elapsedSeconds % 60).padStart(2, '0');
    const formatted =
      before.elapsedSeconds >= 3600
        ? `${Math.floor(before.elapsedSeconds / 3600)}:${mm}:${ss}`
        : `${mm}:${ss}`;
    await expect(page.getByLabel(`Elapsed time ${formatted}`)).toBeVisible();
  });

  test('finish leaves the assignment unchanged', async ({ page, request }) => {
    const { email, accessToken } = await createAuthenticatedUserViaApi(request);
    const title = assignmentTitle();
    const created = await createAssignmentViaApi(request, accessToken, { title });
    await loginViaUi(page, email);
    await page.goto('/assignments');

    const beforeRes = await request.get('/api/assignments', {
      headers: authHeaders(accessToken),
    });
    expect(beforeRes.status()).toBe(200);
    const beforeList = (await beforeRes.json()) as Array<Record<string, unknown>>;
    const beforeRow = beforeList.find((r) => r.id === created.id)!;
    expect(beforeRow).toBeTruthy();

    await startSessionThroughUi(page, title);
    await page.getByRole('button', { name: 'Finish session' }).click();
    await expect(page.getByRole('heading', { name: 'Finish this session' })).toBeVisible();
    await page.getByLabel('Minutes to record').fill('45');
    await page.getByRole('button', { name: 'Save time' }).click();
    await expect(page.getByText('45 minutes recorded')).toBeVisible();

    const afterRes = await request.get('/api/assignments', {
      headers: authHeaders(accessToken),
    });
    expect(afterRes.status()).toBe(200);
    const afterList = (await afterRes.json()) as Array<Record<string, unknown>>;
    const afterRow = afterList.find((r) => r.id === created.id)!;
    expect(afterRow).toBeTruthy();
    expect(JSON.stringify(afterRow)).toBe(JSON.stringify(beforeRow));
  });

  test('recorded time reaches the confirmed-time endpoint', async ({ page, request }) => {
    const { email, accessToken } = await createAuthenticatedUserViaApi(request);
    const title = assignmentTitle();
    const created = await createAssignmentViaApi(request, accessToken, { title });
    await loginViaUi(page, email);
    await page.goto('/assignments');
    await startSessionThroughUi(page, title);
    await page.getByRole('button', { name: 'Finish session' }).click();
    await page.getByLabel('Minutes to record').fill('45');
    await page.getByRole('button', { name: 'Save time' }).click();
    await expect(page.getByText('45 minutes recorded')).toBeVisible();

    const ctRes = await request.get(
      `/api/study-sessions/confirmed-time?assignmentId=${created.id}`,
      { headers: authHeaders(accessToken) }
    );
    expect(ctRes.status()).toBe(200);
    const ct = (await ctRes.json()) as {
      assignmentId: string;
      confirmedMinutes: number;
      sessionCount: number;
    };
    expect(ct.assignmentId).toBe(created.id);
    expect(ct.confirmedMinutes).toBe(45);
    expect(ct.sessionCount).toBe(1);

    const listRes = await request.get(`/api/study-sessions?assignmentId=${created.id}`, {
      headers: authHeaders(accessToken),
    });
    expect(listRes.status()).toBe(200);
    const list = (await listRes.json()) as {
      items: Array<{ status: string; durationMinutes: number }>;
    };
    expect(list.items.length).toBe(1);
    expect(list.items[0].status).toBe('COMPLETED');
    expect(list.items[0].durationMinutes).toBe(45);
  });

  test('empty study-history state renders for a fresh user', async ({ page, request }) => {
    const { email } = await createAuthenticatedUserViaApi(request);
    await loginViaUi(page, email);
    await page.goto('/focus/history');
    await expect(page.getByText('No study sessions yet')).toBeVisible();
  });

  test('error path: invalid confirmed minutes rejected by client and server', async ({
    page,
    request,
  }) => {
    const { email, accessToken } = await createAuthenticatedUserViaApi(request);
    const title = assignmentTitle();
    const created = await createAssignmentViaApi(request, accessToken, { title });

    // Open a session directly via API for the server-side 400 check.
    const sessionRes = await request.post('/api/study-sessions', {
      headers: authHeaders(accessToken),
      data: { assignmentId: created.id, plannedMinutes: 25 },
    });
    expect(sessionRes.status()).toBe(201);
    const session = (await sessionRes.json()) as { id: string };

    // Force a 400 from the server with an out-of-range confirmedMinutes.
    const badFinish = await request.post(`/api/study-sessions/${session.id}/finish`, {
      headers: authHeaders(accessToken),
      data: { confirmedMinutes: 1441 },
    });
    expect(badFinish.status()).toBe(400);
    const badBody = (await badFinish.json()) as { errors?: Record<string, unknown> };
    expect(badBody.errors).toBeTruthy();
    expect(badBody.errors!.confirmedMinutes).toBeTruthy();

    // UI path: log in and drive the focus page. The session is still open.
    await loginViaUi(page, email);
    await page.goto('/focus');
    await expect(page.getByRole('button', { name: 'Finish session' })).toBeVisible();
    await page.getByRole('button', { name: 'Finish session' }).click();
    await expect(page.getByRole('heading', { name: 'Finish this session' })).toBeVisible();
    await page.getByLabel('Minutes to record').fill('1441');
    await expect(page.getByText('Enter a whole number between 0 and 1440.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save time' })).toBeDisabled();
  });

  test('ownership: foreign session and assignment are unreachable', async ({ request }) => {
    const userA = await createAuthenticatedUserViaApi(request);
    const userB = await createAuthenticatedUserViaApi(request);
    const title = assignmentTitle();
    const assignment = await createAssignmentViaApi(request, userA.accessToken, { title });
    const sessionRes = await request.post('/api/study-sessions', {
      headers: authHeaders(userA.accessToken),
      data: { assignmentId: assignment.id, plannedMinutes: 25 },
    });
    expect(sessionRes.status()).toBe(201);
    const session = (await sessionRes.json()) as { id: string };

    // pause
    const pauseRes = await request.post(`/api/study-sessions/${session.id}/pause`, {
      headers: authHeaders(userB.accessToken),
    });
    expect(pauseRes.status()).toBe(404);
    expect((await pauseRes.json()).message).toBe('Resource not found');

    // finish
    const finishRes = await request.post(`/api/study-sessions/${session.id}/finish`, {
      headers: authHeaders(userB.accessToken),
      data: { confirmedMinutes: 10 },
    });
    expect(finishRes.status()).toBe(404);
    expect((await finishRes.json()).message).toBe('Resource not found');

    // confirmed-time for foreign assignment
    const ctRes = await request.get(
      `/api/study-sessions/confirmed-time?assignmentId=${assignment.id}`,
      { headers: authHeaders(userB.accessToken) }
    );
    expect(ctRes.status()).toBe(404);
    expect((await ctRes.json()).message).toBe('Resource not found');

    // current for user B is their own (null/empty), not a foreign leak
    const curRes = await request.get('/api/study-sessions/current', {
      headers: authHeaders(userB.accessToken),
    });
    expect(curRes.status()).toBe(200);
    const curText = await curRes.text();
    expect(curText === '' || curText === 'null').toBeTruthy();
  });
});

test.describe('study sessions — calendar regression', () => {
  test('an open (null endTime) session appears in the calendar', async ({ page, request }) => {
    const { email, accessToken } = await createAuthenticatedUserViaApi(request);
    const title = assignmentTitle();
    const assignment = await createAssignmentViaApi(request, accessToken, { title });
    const sessionRes = await request.post('/api/study-sessions', {
      headers: authHeaders(accessToken),
      data: { assignmentId: assignment.id, plannedMinutes: 25 },
    });
    expect(sessionRes.status()).toBe(201);

    await loginViaUi(page, email);
    await page.goto('/calendar');
    await expect(page.getByRole('button', { name: /Study session/ }).first()).toBeVisible();
  });
});

test.describe('study sessions — mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('focus controls are tappable and no horizontal scroll', async ({ page, request }) => {
    const { email, accessToken } = await createAuthenticatedUserViaApi(request);
    const title = assignmentTitle();
    await createAssignmentViaApi(request, accessToken, { title });
    await loginViaUi(page, email);
    await page.goto('/assignments');
    await startSessionThroughUi(page, title);

    // Pause then resume
    const pauseBtn = page.getByRole('button', { name: 'Pause' });
    await expect(pauseBtn).toBeVisible();
    const pauseBox = await pauseBtn.boundingBox();
    expect(pauseBox).toBeTruthy();
    expect(pauseBox!.width).toBeGreaterThanOrEqual(44);
    expect(pauseBox!.height).toBeGreaterThanOrEqual(44);

    await pauseBtn.click();
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
