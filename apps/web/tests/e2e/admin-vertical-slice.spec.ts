import { expect, test } from '@playwright/test';

test('admin vertical slice works end to end', async ({ page }) => {
  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: 'Admin Workspace' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Launch Slice' })).toBeVisible();

  await page.getByRole('button', { name: 'Create Season' }).click();
  await expect(page.getByText(/Season created:/)).toBeVisible();
  await expect(page.getByText('Done')).toHaveCount(2);

  await page.getByRole('button', { name: 'Create Grade' }).click();
  await expect(page.getByText('Grade created: Mixed D.')).toBeVisible();

  await page.getByRole('button', { name: 'Create Court' }).click();
  await expect(page.getByText('Court created: Court 4.')).toBeVisible();

  await page.getByRole('button', { name: 'Create Timeslot' }).click();
  await expect(page.getByText('Timeslot created: Late Slot.')).toBeVisible();

  for (const teamName of ['Ball Slappers', 'Net Ninjas', 'Sky Spikers', 'Court Crushers']) {
    await page.getByLabel('Team Name').fill(teamName);
    await page.getByRole('button', { name: 'Create Team' }).click();
    await expect(page.getByText(`Team created: ${teamName}.`)).toBeVisible();
  }

  await page.getByRole('button', { name: 'Generate Fixtures' }).click();
  await expect(page.getByText('Fixtures generated.')).toBeVisible();
  await expect(page.getByText(/Fixtures: [1-9]/)).toBeVisible();

  await page.getByRole('button', { name: 'Generate Duties' }).click();
  await expect(page.getByText('Duties generated.')).toBeVisible();
  await expect(page.getByText(/Duties: [1-9]/)).toBeVisible();

  await page.getByRole('button', { name: 'Publish Season' }).click();
  await expect(page.getByText('Season published.')).toBeVisible();
  await expect(page.getByText('Status: PUBLISHED')).toBeVisible();

  await expect(page.getByText('Hard Conflicts')).toBeVisible();
  await expect(page.getByText('Duty Fairness')).toBeVisible();
});
