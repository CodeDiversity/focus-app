import { expect, test } from '@playwright/test';

import { createAuthenticatedUserViaApi, loginViaUi } from './helpers';

test.describe.configure({ mode: 'serial' });

test('renders the calendar page for an authenticated user', async ({ page, request }) => {
  const { email } = await createAuthenticatedUserViaApi(request);
  await loginViaUi(page, email);
  await page.goto('/calendar');

  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Manage availability' })).toBeVisible();
});

test('navigates between weeks with previous/next', async ({ page, request }) => {
  const { email } = await createAuthenticatedUserViaApi(request);
  await loginViaUi(page, email);
  await page.goto('/calendar');

  await page.getByRole('button', { name: 'Next week' }).click();
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
});