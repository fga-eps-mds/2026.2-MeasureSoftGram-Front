import { expect, test } from '@playwright/test';

test('fumaça: a landing abre', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/MeasureSoftGram/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
