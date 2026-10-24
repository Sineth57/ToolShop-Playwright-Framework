const { test, expect } = require('../../../fixtures/test');

test.describe('Login session (positive)', () => {
  test.beforeEach(async ({ loginPage, newUser }) => {
    await loginPage.goto();
    await loginPage.login(newUser.email, newUser.password);
    await expect(loginPage.nav.signIn).toBeHidden();
  });

  test('TC214 - the user stays logged in on another page', async ({ homePage, page }) => {
    await homePage.nav.contact.click();

    await expect(page).toHaveURL(/contact/);
    await expect(homePage.nav.signIn).toBeHidden();
  });

  // test('the user stays logged in after reloading the page', async ({ homePage, page }) => {
  //   await page.reload();

  //   await expect(homePage.productNames.first()).toBeVisible();
  //   await expect(homePage.nav.signIn).toBeHidden();
  // });

  test('TC215 - the user stays logged in after reloading the page', async ({ homePage, page }) => {
  await homePage.goto();

  await expect(homePage.productNames.first()).toBeVisible();
  await expect(homePage.nav.signIn).toBeHidden();

  await page.reload();

  await expect(homePage.productNames.first()).toBeVisible();
  await expect(homePage.nav.signIn).toBeHidden();
});
});