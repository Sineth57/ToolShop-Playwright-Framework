const { test, expect } = require('@playwright/test');
const { HomePage } = require('../../../pages/HomePage');

test.describe('Home page (positive)', () => {
  test('displays product cards on load', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.productNames.first()).toBeVisible();
  });

  test('search filters products by keyword', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.search('hammer');

    await expect(home.productNames.first()).toContainText(/hammer/i);
  });
});