import { expect, test } from '@playwright/test';

import {
  createAuthenticatedUserViaApi,
  createCourseViaApi,
  createSemesterViaApi,
  loginViaUi,
} from './helpers';

/**
 * SP-124 assignment list cohesion against the real stack: the cross-course
 * list hosts the shared create/edit/delete/status interaction (A/B/C), the
 * empty-state create keeps keyboard focus, and the mobile create controls keep
 * 44 px touch targets without horizontal overflow.
 */

const uniqueSuffix = () => `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

// Cold self-contained stack: keep this file's real-browser journeys serial so
// login's silent session restore does not contend across newly started workers.
test.describe.configure({ mode: 'serial' });

test('creates from the empty list, keeps focus, and edits/deletes through the shared row', async ({
  page,
  request,
}) => {
  const { email } = await createAuthenticatedUserViaApi(request);
  await loginViaUi(page, email);
  await page.goto('/assignments');

  await expect(page.getByText('No assignments yet.')).toBeVisible();
  const emptyAdd = page.getByRole('button', { name: 'Add your first assignment' });
  await emptyAdd.click();

  const createDialog = page.getByRole('dialog', { name: 'Add an assignment' });
  await expect(createDialog.getByLabel('Title')).toBeFocused();
  await expect(createDialog.getByLabel('Course')).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(createDialog).toHaveCount(0);
  await expect(emptyAdd).toBeFocused();

  await emptyAdd.click();
  const title = `E2E Assignment ${uniqueSuffix()}`;
  await page.getByRole('dialog', { name: 'Add an assignment' }).getByLabel('Title').fill(title);
  await page
    .getByRole('dialog', { name: 'Add an assignment' })
    .getByRole('button', { name: 'Create assignment' })
    .click();

  await expect(page.getByText('Assignment added. Showing 1 assignment.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add assignment' })).toBeFocused();

  const row = page.locator('li').filter({ hasText: title });
  await expect(row).toBeVisible();
  await expect(row).toContainText('No course');

  // The title button opens the shared edit dialog; edit never offers a course.
  await row.getByRole('button', { name: title, exact: true }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit assignment' });
  await expect(editDialog.getByLabel('Title')).toHaveValue(title);
  await expect(editDialog.getByLabel('Course')).toHaveCount(0);
  await editDialog.getByLabel('Priority').selectOption('URGENT');
  await editDialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Assignment updated. Showing 1 assignment.')).toBeVisible();
  await expect(row).toContainText('Urgent');

  await row.getByRole('combobox', { name: `Status for ${title}` }).selectOption('COMPLETED');
  await expect(
    page.getByText('Assignment marked as completed. Showing 1 assignment.')
  ).toBeVisible();

  // The overflow menu opens Delete (R-125-007); no always-visible text button.
  await row.getByRole('button', { name: `Actions for ${title}` }).click();
  await row.getByRole('menuitem', { name: `Delete ${title}` }).click();
  const deleteDialog = page.getByRole('dialog', { name: `Delete ${title}?` });
  await deleteDialog.getByRole('button', { name: `Delete ${title}` }).click();
  await expect(page.getByText('No assignments yet.')).toBeVisible();
});

test('prefills the create course from the active filter and links the created row to its course', async ({
  page,
  request,
}) => {
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
  await loginViaUi(page, email);
  await page.goto('/assignments');

  await page.getByLabel('Course').selectOption(course.id);
  await expect(page.getByText('No assignments match these filters.')).toBeVisible();

  await page.getByRole('button', { name: 'Add assignment' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add an assignment' });
  await expect(dialog.getByLabel('Course')).toHaveValue(course.id);

  const title = `E2E Filtered Assignment ${uniqueSuffix()}`;
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByRole('button', { name: 'Create assignment' }).click();

  await expect(page.getByText('Assignment added. Showing 1 assignment.')).toBeVisible();
  const row = page.locator('li').filter({ hasText: title });
  await expect(row).toBeVisible();
  await expect(row).toContainText(course.code);
  await expect(row.getByRole('link', { name: `View course: ${course.name}` })).toHaveAttribute(
    'href',
    `/courses/${course.id}`
  );
});

test('course host keeps its fixed course and supports subtasks plus status', async ({
  page,
  request,
}) => {
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
  await loginViaUi(page, email);
  await page.goto(`/courses/${course.id}`);

  await page.getByRole('button', { name: 'Add assignment' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add an assignment' });
  await expect(dialog.getByLabel('Course')).toHaveCount(0);
  const title = `E2E Course Assignment ${uniqueSuffix()}`;
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByRole('button', { name: 'Create assignment' }).click();
  await expect(page.getByText('Assignment added.')).toBeVisible();

  const row = page.locator('li').filter({ hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: `Subtasks for ${title}: No subtasks` }).click();
  await row.getByLabel('Subtask title').fill('Read chapter 1');
  await row.getByRole('button', { name: `Add subtask to ${title}` }).click();
  // The mutation refetches and D124-5 resets the disclosure; reopen it.
  const toggle = row.getByRole('button', { name: `Subtasks for ${title}: 1 subtask` });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(row.getByRole('checkbox', { name: 'Read chapter 1' })).toBeVisible();
  await row.getByRole('checkbox', { name: 'Read chapter 1' }).click();
  await expect(page.getByText('Subtask completed.')).toBeVisible();

  await row.getByRole('combobox', { name: `Status for ${title}` }).selectOption('COMPLETED');
  await expect(page.getByText('Assignment marked as completed.')).toBeVisible();
  await expect(row).toHaveCount(0);
  await page.getByRole('button', { name: 'Show completed (1)' }).click();
  await expect(page.locator('li').filter({ hasText: title })).toBeVisible();
});

test.describe('mobile create surface', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('keeps create controls at 44 px without horizontal overflow', async ({ page, request }) => {
    const { email } = await createAuthenticatedUserViaApi(request);
    await loginViaUi(page, email);
    await page.goto('/assignments');
    await expect(page.getByText('No assignments yet.')).toBeVisible();

    const headerAdd = page.getByRole('button', { name: 'Add assignment' });
    const headerBox = await headerAdd.boundingBox();
    expect(headerBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await headerAdd.click();
    const dialog = page.getByRole('dialog', { name: 'Add an assignment' });
    const courseBox = await dialog.getByLabel('Course').boundingBox();
    const submitBox = await dialog.getByRole('button', { name: 'Create assignment' }).boundingBox();
    expect(courseBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(submitBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    const noHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    );
    expect(noHorizontalOverflow).toBe(true);
  });

  test('keeps course-host row controls at 44 px', async ({ page, request }) => {
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
    await loginViaUi(page, email);
    await page.goto(`/courses/${course.id}`);

    await page.getByRole('button', { name: 'Add assignment' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add an assignment' });
    const title = `E2E Mobile Row ${uniqueSuffix()}`;
    await dialog.getByLabel('Title').fill(title);
    await dialog.getByRole('button', { name: 'Create assignment' }).click();
    await expect(page.getByText('Assignment added.')).toBeVisible();

    const row = page.locator('li').filter({ hasText: title });
    const statusBox = await row
      .getByRole('combobox', { name: `Status for ${title}` })
      .boundingBox();
    const actionsBox = await row
      .getByRole('button', { name: `Actions for ${title}` })
      .boundingBox();
    const disclosureBox = await row
      .getByRole('button', { name: `Subtasks for ${title}: No subtasks` })
      .boundingBox();
    expect(statusBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(actionsBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(disclosureBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
