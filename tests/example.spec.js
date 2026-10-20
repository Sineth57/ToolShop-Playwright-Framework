const { test, expect } = require('@playwright/test');

test('home page shows product cards', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('product-name').first()).toBeVisible();
});