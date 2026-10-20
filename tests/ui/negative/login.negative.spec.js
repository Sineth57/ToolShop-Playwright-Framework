const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../../pages/LoginPage');

test.describe('Login (negative)', () => {
  test('shows an error for a wrong password', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(process.env.USER_EMAIL, 'WrongPassword!123');

    await expect(login.errorMessage).toBeVisible();
    await expect(page).toHaveURL(/auth\/login/);
  });
});