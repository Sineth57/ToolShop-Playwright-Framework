const { test, expect } = require('../../../fixtures/test');

test.describe('Login (positive)', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('a registered user can log in', async ({ loginPage, newUser }) => {
    await loginPage.login(newUser.email, newUser.password);

    await expect(loginPage.nav.signIn).toBeHidden();
  });

  test('the login page links to registration', async ({ loginPage, page }) => {
    await loginPage.registerLink.click();

    await expect(page).toHaveURL(/auth\/register/);
  });

  test('the login page links to password recovery', async ({ loginPage, page }) => {
    await loginPage.forgotPasswordLink.click();

    await expect(page).toHaveURL(/forgot/i);
  });
});