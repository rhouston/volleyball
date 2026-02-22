import { expect, test } from '@playwright/test';

test('home page renders league manager heading', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Volleyball Season Manager' })).toBeVisible();
  await expect(page.getByText('Fixtures, duties, standings, and player votes in one place.')).toBeVisible();
});
