const { test, expect } = require('../../../fixtures/test');

test.describe('Login (positive)', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('TC200 - a registered user can log in', async ({ loginPage, newUser }) => {
    await loginPage.login(newUser.email, newUser.password);

    await expect(loginPage.nav.signIn).toBeHidden();
  });

  test('TC201 - the login page links to registration', async ({ loginPage, page }) => {
    await loginPage.registerLink.click();

    await expect(page).toHaveURL(/auth\/register/);
  });

  test('TC202 - the login page links to password recovery', async ({ loginPage, page }) => {
    await loginPage.forgotPasswordLink.click();

    await expect(page).toHaveURL(/forgot/i);
  });
});