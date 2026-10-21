const { test, expect } = require('../../../fixtures/test');
const { expectErrorMessage, watchDialogs } = require('../../../utils/formMessages');
const data = require('../../../test-data/ui-validation-data.json').login;

test.describe('Login (negative)', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test.describe('required fields', () => {
    test('submitting an empty form shows required errors', async ({ loginPage }) => {
      await loginPage.submitButton.click();
      await expect(loginPage.emailError).toBeVisible();
      await expect(loginPage.passwordError).toBeVisible();
    });

    test('an empty email shows only the email error', async ({ loginPage }) => {
      await loginPage.passwordInput.fill('SomePassword1!');
      await loginPage.submitButton.click();

      await expectErrorMessage(loginPage.emailError, 'login: empty email');
      await expect(loginPage.passwordError).toBeHidden();
    });

    test('an empty password shows only the password error', async ({ loginPage }) => {
      await loginPage.emailInput.fill('someone@example.com');
      await loginPage.submitButton.click();

      await expectErrorMessage(loginPage.passwordError, 'login: empty password');
      await expect(loginPage.emailError).toBeHidden();
    });

    test('fields that contain only spaces are refused', async ({ loginPage, page }) => {
      await loginPage.login('   ', '   ');

      await expectErrorMessage(loginPage.anyError.first(), 'login: only spaces');
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('pressing Enter on an empty form shows the required errors', async ({ loginPage }) => {
      await loginPage.emailInput.press('Enter');

      await expect(loginPage.emailError).toBeVisible();
      await expect(loginPage.passwordError).toBeVisible();
    });

    test('an error disappears once the field is corrected', async ({ loginPage }) => {
      await loginPage.submitButton.click();
      await expect(loginPage.emailError).toBeVisible();

      await loginPage.emailInput.fill('someone@example.com');

      await expect(loginPage.emailError).toBeHidden();
    });
  });

  test.describe('invalid email formats', () => {
    test('an invalid email format shows an email error', async ({ loginPage }) => {
      await loginPage.login('not-an-email', 'SomePassword1!');
      await expect(loginPage.emailError).toBeVisible();
    });

    for (const { name, value } of data.invalidEmails) {
      test(`${name} is refused as the email`, async ({ loginPage, page }) => {
        await loginPage.login(value, 'SomePassword1!');

        await expectErrorMessage(loginPage.emailError, `login: invalid email (${name})`);
        await expect(page).toHaveURL(/auth\/login/);
      });
    }
  });

  test.describe('wrong credentials', () => {
    test('a wrong password shows an error and stays on the login page', async ({ loginPage, newUser, page }) => {
      await loginPage.login(newUser.email, 'WrongPassword!123');
      await expect(loginPage.loginError).toBeVisible();
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('an unknown email shows an error', async ({ loginPage, page }) => {
      await loginPage.login('nobody-here@example.com', 'SomePassword1!');
      await expect(loginPage.loginError).toBeVisible();
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('a wrong password and an unknown email show the same message', async ({ loginPage, newUser }) => {
      // Different messages would tell an attacker which email addresses have an account
      await loginPage.login(newUser.email, 'WrongPassword!123');
      const wrongPassword = await expectErrorMessage(loginPage.loginError, 'login: wrong password');

      await loginPage.goto();
      await loginPage.login(`nobody.${Date.now()}@example.com`, 'WrongPassword!123');
      const unknownEmail = await expectErrorMessage(loginPage.loginError, 'login: unknown email');

      expect(wrongPassword).toBe(unknownEmail);
    });

    test('the typed email is kept after a failed login', async ({ loginPage, newUser }) => {
      await loginPage.login(newUser.email, 'WrongPassword!123');
      await expect(loginPage.loginError).toBeVisible();

      await expect(loginPage.emailInput).toHaveValue(newUser.email);
    });

    test('a failed login stores no access token in the browser', async ({ loginPage, newUser, page }) => {
      await loginPage.login(newUser.email, 'WrongPassword!123');
      await expect(loginPage.loginError).toBeVisible();

      const stored = await page.evaluate(() =>
        JSON.stringify({
          local: Object.fromEntries(Object.entries(localStorage)),
          session: Object.fromEntries(Object.entries(sessionStorage)),
        }),
      );

      expect(stored).not.toMatch(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);
    });

    test('the typed email and password never appear in the address bar', async ({ loginPage, newUser, page }) => {
      await loginPage.login(newUser.email, 'WrongPassword!123');
      await expect(loginPage.loginError).toBeVisible();

      expect(page.url()).not.toContain('WrongPassword');
      expect(page.url()).not.toContain(encodeURIComponent(newUser.email));
    });

    test('a locked account cannot log in through the form, even with the right password', async ({
      loginPage, newUser, authApi, page,
    }) => {
      // Lock the throwaway account quickly through the API
      let locked = false;
      for (let attempt = 1; attempt <= 10 && !locked; attempt += 1) {
        const response = await authApi.login(newUser.email, `WrongPassword-${attempt}!`);
        locked = response.status() === 423;
      }
      expect(locked, 'the account could not be locked through the API').toBe(true);

      await loginPage.login(newUser.email, newUser.password);

      await expectErrorMessage(loginPage.loginError, 'login: locked account');
      await expect(page).toHaveURL(/auth\/login/);
      await expect(loginPage.nav.signIn).toBeVisible();
    });
  });

  test.describe('hostile and extreme input', () => {
    for (const { name, value } of data.attackPasswords) {
      test(`${name} in the password is refused and does not run`, async ({ loginPage, page }) => {
        const dialogs = watchDialogs(page);

        await loginPage.login('nobody-here@example.com', value);

        await expect(loginPage.loginError).toBeVisible();
        await expect(page).toHaveURL(/auth\/login/);
        expect(dialogs, 'a script in the input must not open a dialog').toEqual([]);
      });
    }

    test('a very long email and password are refused without breaking the page', async ({ loginPage, page }) => {
      await loginPage.login(`${'a'.repeat(300)}@example.com`, 'p'.repeat(1000));

      await expectErrorMessage(loginPage.anyError.first(), 'login: very long input');
      await expect(page).toHaveURL(/auth\/login/);
    });
  });

  test.describe('password field', () => {
    test('the password is hidden while typing', async ({ loginPage }) => {
      await loginPage.passwordInput.fill('Secret123!');

      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });

    test('the eye button shows and hides the password', async ({ loginPage }) => {
      await loginPage.passwordInput.fill('Secret123!');

      await loginPage.passwordToggle.click();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');

      await loginPage.passwordToggle.click();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });
  });
});