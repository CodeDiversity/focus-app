import { expect, test } from '@playwright/test';

import {
  createAuthenticatedUserViaApi,
  createCourseViaApi,
  createSemesterViaApi,
  loginViaUi,
} from './helpers';

/**
 * Semester & course management journeys (SP-118), against the real stack:
 * creating, editing, and removing a semester and a course through the real UI
 * (which persists through the real API/database). Edit/delete tests start
 * from known entities created via authenticated API setup calls
 * (`createSemesterViaApi`/`createCourseViaApi`), so each test is independent.
 *
 * Assertions stay on user-visible outcomes (row text, the `role="status"`
 * feedback line, dialog headings) — not DOM internals.
 */

// Names/codes only need per-student uniqueness (409 is student-scoped), so
// worker parallelism cannot collide; every test creates its own user.
const uniqueSuffix = () => `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const uniqueSemesterName = () => `E2E Semester ${uniqueSuffix()}`;
const uniqueCourseName = () => `E2E Course ${uniqueSuffix()}`;
// The course code field allows ≤ 20 characters.
const uniqueCourseCode = () => `E2E-${crypto.randomUUID().slice(0, 8)}`;

test('a signed-in user can create a semester and it appears in the list', async ({
  page,
  request,
}) => {
  const { email } = await createAuthenticatedUserViaApi(request);
  await loginViaUi(page, email);
  await page.goto('/semesters');

  // Fresh user: the empty state offers the first-semester call-to-action.
  await expect(page.getByText('No semesters yet')).toBeVisible();
  await page.getByRole('button', { name: 'Add your first semester' }).click();

  const name = uniqueSemesterName();
  await page.getByLabel('Semester name').fill(name);
  await page.getByLabel('Start date').fill('2026-01-05');
  await page.getByLabel('End date').fill('2026-05-15');
  await page.getByRole('button', { name: 'Create semester' }).click();

  // Success feedback, then the row renders from the re-read API list with
  // readable dates and the course count.
  await expect(page.getByText(`${name} created.`)).toBeVisible();
  const row = page.locator('li').filter({ hasText: name });
  await expect(row).toBeVisible();
  await expect(row).toContainText('Jan 5, 2026');
  await expect(row).toContainText('May 15, 2026');
  await expect(row).toContainText('0 courses');
});

test('editing a semester persists and renders the updated values', async ({ page, request }) => {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);
  const name = uniqueSemesterName();
  await createSemesterViaApi(request, accessToken, {
    name,
    startDate: '2026-01-05',
    endDate: '2026-05-15',
  });
  await loginViaUi(page, email);
  await page.goto('/semesters');
  await expect(page.locator('li').filter({ hasText: name })).toBeVisible();

  await page.getByRole('button', { name: `Edit ${name}` }).click();
  const newName = `${name} renamed`;
  await page.getByLabel('Semester name').fill(newName);
  await page.getByLabel('End date').fill('2026-06-20');
  await page.getByRole('button', { name: 'Save changes' }).click();

  // The updated name and end date render; the old name is gone.
  await expect(page.getByText(`${newName} updated.`)).toBeVisible();
  const updatedRow = page.locator('li').filter({ hasText: newName });
  await expect(updatedRow).toBeVisible();
  await expect(updatedRow).toContainText('Jun 20, 2026');
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
});

test('deleting a semester requires confirmation and removes it', async ({ page, request }) => {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);
  const name = uniqueSemesterName();
  await createSemesterViaApi(request, accessToken, {
    name,
    startDate: '2026-01-05',
    endDate: '2026-05-15',
  });
  await loginViaUi(page, email);
  await page.goto('/semesters');
  await expect(page.locator('li').filter({ hasText: name })).toBeVisible();

  // The confirmation dialog names the semester (the deletion guard is used
  // as-is, not weakened for testability).
  await page.getByRole('button', { name: `Delete ${name}` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: `Delete ${name}?` })).toBeVisible();

  await dialog.getByRole('button', { name: `Delete ${name}` }).click();

  await expect(page.getByText(`${name} deleted. Its courses remain, unaffiliated.`)).toBeVisible();
  await expect(page.locator('li').filter({ hasText: name })).toHaveCount(0);
});

test('a signed-in user can create a course and it appears in the list', async ({
  page,
  request,
}) => {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);
  const semesterName = uniqueSemesterName();
  const semester = await createSemesterViaApi(request, accessToken, {
    name: semesterName,
    startDate: '2026-01-05',
    endDate: '2026-05-15',
  });
  await loginViaUi(page, email);
  await page.goto('/courses');

  // Fresh user: the empty state offers the first-course call-to-action.
  await expect(page.getByText('No courses yet')).toBeVisible();
  await page.getByRole('button', { name: 'Add your first course' }).click();

  const code = uniqueCourseCode();
  const courseName = uniqueCourseName();
  await page.getByLabel('Course code').fill(code);
  await page.getByLabel('Course name').fill(courseName);
  // The picker offers the student's own semesters — select the setup one by
  // its id value (the label's "(active)" suffix may vary).
  await page.getByRole('dialog').getByLabel('Semester').selectOption(semester.id);
  await page.getByLabel('Instructor').fill('Ada Lovelace');
  await page.getByLabel('Credits').fill('4');
  await page.getByRole('button', { name: 'Create course' }).click();

  // The row renders with the code, the attached semester, and the credits.
  await expect(page.getByText(`${courseName} created.`)).toBeVisible();
  const row = page.locator('li').filter({ hasText: courseName });
  await expect(row).toBeVisible();
  await expect(row).toContainText(code);
  await expect(row).toContainText(semesterName);
  await expect(row).toContainText('4 credits');
});

test('editing a course persists and renders the updated values', async ({ page, request }) => {
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);
  const semesterName = uniqueSemesterName();
  const semester = await createSemesterViaApi(request, accessToken, {
    name: semesterName,
    startDate: '2026-01-05',
    endDate: '2026-05-15',
  });
  const courseName = uniqueCourseName();
  const code = uniqueCourseCode();
  await createCourseViaApi(request, accessToken, {
    code,
    name: courseName,
    semesterId: semester.id,
    instructor: 'Ada Lovelace',
    credits: 4,
  });
  await loginViaUi(page, email);
  await page.goto('/courses');
  await expect(page.locator('li').filter({ hasText: courseName })).toBeVisible();

  await page.getByRole('button', { name: `Actions for ${courseName}` }).click();
  await page.getByRole('menuitem', { name: `Edit ${courseName}` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: `Edit ${courseName}` })).toBeVisible();

  const newName = `${courseName} renamed`;
  await dialog.getByLabel('Course name').fill(newName);
  await dialog.getByLabel('Credits').fill('3');
  await dialog.getByLabel('Instructor').fill('Grace Hopper');
  await dialog.getByRole('button', { name: 'Save changes' }).click();

  // The updated values render; the old name is gone.
  await expect(page.getByText(`${newName} updated.`)).toBeVisible();
  const row = page.locator('li').filter({ hasText: newName });
  await expect(row).toBeVisible();
  await expect(row).toContainText(code);
  await expect(row).toContainText('3 credits');
  await expect(row).toContainText(semesterName);
  await expect(page.getByText(courseName, { exact: true })).toHaveCount(0);

  // The instructor change persisted (the list does not render it) — the
  // reopened dialog is prefilled with the stored value.
  await page.getByRole('button', { name: `Actions for ${newName}` }).click();
  await page.getByRole('menuitem', { name: `Edit ${newName}` }).click();
  await expect(page.getByRole('dialog').getByLabel('Instructor')).toHaveValue('Grace Hopper');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
});

test('archiving hides a course from the active list and it can be restored', async ({
  page,
  request,
}) => {
  // Courses have no hard delete (D111-2): the product's "removal" is the
  // reversible archive with its own confirmation dialog — exercised as-is.
  const { email, accessToken } = await createAuthenticatedUserViaApi(request);
  const courseName = uniqueCourseName();
  await createCourseViaApi(request, accessToken, {
    code: uniqueCourseCode(),
    name: courseName,
  });
  await loginViaUi(page, email);
  await page.goto('/courses');
  const row = page.locator('li').filter({ hasText: courseName });
  await expect(row).toBeVisible();

  // Archive with confirmation.
  await page.getByRole('button', { name: `Actions for ${courseName}` }).click();
  await page.getByRole('menuitem', { name: `Archive ${courseName}` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: `Archive ${courseName}?` })).toBeVisible();
  await dialog.getByRole('button', { name: `Archive ${courseName}` }).click();

  await expect(
    page.getByText(`${courseName} archived. You can restore it at any time.`)
  ).toBeVisible();
  await expect(row).toHaveCount(0);

  // The "Show archived" switch reveals the row with its text badge.
  await page.getByRole('switch').click();
  await expect(row).toBeVisible();
  await expect(row).toContainText('Archived');

  // Restore puts it back in the active list (badge gone).
  await page.getByRole('button', { name: `Actions for ${courseName}` }).click();
  await page.getByRole('menuitem', { name: `Restore ${courseName}` }).click();
  await expect(dialog.getByRole('heading', { name: `Restore ${courseName}?` })).toBeVisible();
  await dialog.getByRole('button', { name: `Restore ${courseName}` }).click();
  await expect(page.getByText(`${courseName} restored.`)).toBeVisible();
  await expect(row).toBeVisible();
  await expect(row).not.toContainText('Archived');
});

test('submitting an empty semester form shows inline validation errors', async ({
  page,
  request,
}) => {
  // The story's one explicit negative case: required-field errors render
  // inline and nothing is created (unit tests own exhaustive validation).
  const { email } = await createAuthenticatedUserViaApi(request);
  await loginViaUi(page, email);
  await page.goto('/semesters');
  await page.getByRole('button', { name: 'Add your first semester' }).click();

  await page.getByRole('button', { name: 'Create semester' }).click();

  await expect(page.getByText('Semester name is required')).toBeVisible();
  await expect(page.getByText('Start date is required')).toBeVisible();
  await expect(page.getByText('End date is required')).toBeVisible();
  // The form stays open — nothing was created.
  await expect(page.getByRole('heading', { name: 'Add a semester' })).toBeVisible();
});
