const { test, expect } = require('../../../fixtures/test');

test.describe('Home page (negative)', () => {
  test('a search with no matches shows no products', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.productNames.first()).toBeVisible();

    await homePage.search('zzzzqqqqxxxx');

    await expect(homePage.productNames).toHaveCount(0);
  });
});