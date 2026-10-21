const { test, expect } = require('../../../fixtures/test');

test.describe('Login (negative)', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('submitting an empty form shows required errors', async ({ loginPage }) => {
    await loginPage.submitButton.click();

    await expect(loginPage.emailError).toBeVisible();
    await expect(loginPage.passwordError).toBeVisible();
  });

  test('an invalid email format shows an email error', async ({ loginPage }) => {
    await loginPage.login('not-an-email', 'SomePassword1!');

    await expect(loginPage.emailError).toBeVisible();
  });

  test('a wrong password shows an error and stays on the login page', async ({ loginPage, newUser, page }) => {
    // A throwaway user, so shared accounts are never locked out
    await loginPage.login(newUser.email, 'WrongPassword!123');

    await expect(loginPage.loginError).toBeVisible();
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('an unknown email shows an error', async ({ loginPage, page }) => {
    await loginPage.login('nobody-here@example.com', 'SomePassword1!');

    await expect(loginPage.loginError).toBeVisible();
    await expect(page).toHaveURL(/auth\/login/);
  });
});