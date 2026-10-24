const { test, expect } = require('../../../fixtures/test');
const { uniqueEmail, buildUserPayload } = require('../../../utils/userFactory');
const { expectErrorMessage, watchDialogs } = require('../../../utils/formMessages');
const data = require('../../../test-data/ui-data.json');
const form = require('../../../test-data/ui-validation-data.json').register;

// valid registration whose fields can be changed one at a time
const validForm = (overrides = {}) => ({
  ...data.registration,
  email: uniqueEmail('ui'),
  ...overrides,
});

async function submitForm(registerPage, overrides) {
  await registerPage.fillForm(validForm(overrides));
  await registerPage.submit();
}

async function waitForAddressAutofill(registerPage) {
  await expect(registerPage.street).not.toHaveValue(data.registration.street);
  await expect(registerPage.city).not.toHaveValue(data.registration.city);
  await expect(registerPage.state).not.toHaveValue(data.registration.state);
}

const dobMessage = (page) =>
  page.getByText(/Customer must be (18 years old|younger than 75 years old)/).first();

const addressErrorIds = ['street-error', 'city-error', 'state-error'];

test.describe('Registration (negative)', () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test.describe('required fields', () => {
    for (const { field, errorId } of data.registerRequiredFields) {
      test(`TC152 - an empty form shows a required error for ${field}`, async ({ registerPage }) => {
        await registerPage.submit();

        await expect(registerPage.error(errorId)).toBeVisible();
      });
    }

    // everything filled except one field that field's error must appear
    for (const { field, errorId } of data.registerRequiredFields) {
      test(`TC153 - leaving only the ${field} empty shows its error`, async ({ registerPage, page }) => {
        await registerPage.fillForm(validForm());
        if (addressErrorIds.includes(errorId)) {
          await waitForAddressAutofill(registerPage);
        }
        await registerPage.field(errorId.replace(/-error$/, '')).fill('');
        await registerPage.submit();

        await expectErrorMessage(registerPage.error(errorId), `register: empty ${field}`);
        await expect(page).toHaveURL(/auth\/register/);
      });
    }

    test('TC154 - an error disappears once the field is filled in', async ({ registerPage }) => {
      await registerPage.submit();
      await expect(registerPage.error('first-name-error')).toBeVisible();

      await registerPage.firstName.fill('Test');

      await registerPage.firstName.blur();

      await expect(registerPage.error('first-name-error')).toBeHidden();
    });

    test('TC155 - pressing Enter on an empty form shows the required errors', async ({ registerPage }) => {
      await registerPage.firstName.press('Enter');

      await expect(registerPage.error('first-name-error')).toBeVisible();
    });
  });

  test.describe('email', () => {
    for (const { name, value } of form.invalidEmails) {
      test(`TC156 - ${name} is refused as the email`, async ({ registerPage, page }) => {
        await submitForm(registerPage, { email: value });

        await expectErrorMessage(registerPage.error('email-error'), `register: invalid email (${name})`);
        await expect(page).toHaveURL(/auth\/register/);
      });
    }

    test('TC157 - an email that is already registered is refused', async ({ registerPage, newUser, page }) => {
      await submitForm(registerPage, { email: newUser.email });

      await expectErrorMessage(registerPage.anyMessage.first(), 'register: email already registered');
      await expect(page).toHaveURL(/auth\/register/);
    });
  });

  test.describe('date of birth', () => {
    for (const { name, value } of form.invalidDates) {
      test(`TC158 - ${name} is refused as the date of birth`, async ({ registerPage, page }) => {
        await submitForm(registerPage, { dob: value });

        await expectErrorMessage(dobMessage(page), `register: dob (${name})`);
        await expect(page).toHaveURL(/auth\/register/);
      });
    }

    test('TC159 - a date of birth of today is refused', async ({ registerPage, page }) => {
      await submitForm(registerPage, { dob: new Date().toISOString().slice(0, 10) });

      await expectErrorMessage(dobMessage(page), 'register: dob (today)');
      await expect(page).toHaveURL(/auth\/register/);
    });
  });

  test.describe('password', () => {
    test('TC160 - a weak password is rejected and the user stays on the registration page', async ({ registerPage, page }) => {
      await registerPage.fillForm({
        ...data.registration,
        email: uniqueEmail('ui'),
        password: data.weakPassword,
      });
      await registerPage.submit();

      await expect(registerPage.error('password-error')).toBeVisible();
      await expect(page).toHaveURL(/auth\/register/);
    });

    for (const { name, value } of form.weakPasswords) {
      test(`TC161 - ${name} is refused`, async ({ registerPage, page }) => {
        await submitForm(registerPage, { password: value });

        await expectErrorMessage(registerPage.error('password-error'), `register: password (${name})`);
        await expect(page).toHaveURL(/auth\/register/);
      });
    }

    test('TC162 - the password is hidden while typing', async ({ registerPage }) => {
      await registerPage.password.fill('Secret123!');

      await expect(registerPage.password).toHaveAttribute('type', 'password');
    });

    test('TC163 - the eye button shows and hides the password', async ({ registerPage }) => {
      await registerPage.password.fill('Secret123!');

      await registerPage.passwordToggle.click();
      await expect(registerPage.password).toHaveAttribute('type', 'text');

      await registerPage.passwordToggle.click();
      await expect(registerPage.password).toHaveAttribute('type', 'password');
    });
  });

  test.describe('other fields', () => {
    test('TC164 - letters in the phone number are refused', async ({ registerPage, page }) => {
      await submitForm(registerPage, { phone: form.phoneWithLetters });

      await expectErrorMessage(registerPage.error('phone-error'), 'register: phone with letters');
      await expect(page).toHaveURL(/auth\/register/);
    });

    test('TC165 - a very long first name is refused', async ({ registerPage, page }) => {
      await submitForm(registerPage, { firstName: 'a'.repeat(300) });

      await expectErrorMessage(registerPage.anyMessage.first(), 'register: very long first name');
      await expect(page).toHaveURL(/auth\/register/);
    });

    for (const { name, country, value } of form.invalidPostalCodes) {
      test(`TC166 - ${name} is refused`, async ({ registerPage, page }) => {
        await submitForm(registerPage, { country, postalCode: value });

        await expectErrorMessage(registerPage.error('postal_code-error'), `register: postal code (${name})`);
        await expect(page).toHaveURL(/auth\/register/);
      });
    }
  });

  test.describe('form behaviour after an error', () => {
    test('TC167 - the entered values are kept after a failed submit', async ({ registerPage }) => {
      await submitForm(registerPage, { password: data.weakPassword });
      await expect(registerPage.error('password-error')).toBeVisible();

      await expect(registerPage.firstName).toHaveValue(data.registration.firstName);
      await expect(registerPage.lastName).toHaveValue(data.registration.lastName);
      await expect(registerPage.phone).toHaveValue(data.registration.phone);
    });
  });

  test.describe('hostile input', () => {
    test('TC168 - script text in the first name does not run', async ({ registerPage, page }) => {
      const dialogs = watchDialogs(page);

      await submitForm(registerPage, { firstName: '<img src=x onerror=alert(1)>' });

      await expect(registerPage.anyMessage.first().or(page.getByTestId('login-form'))).toBeVisible();

      expect(dialogs, 'a script in the input must not open a dialog').toEqual([]);
    });

    test('TC169 - a first name with script text does not run after the user logs in', async ({
      authApi, loginPage, page,
    }) => {
      const dialogs = watchDialogs(page);
      const user = buildUserPayload({ first_name: '<img src=x onerror=alert(1)>' });
      const register = await authApi.register(user);
      test.skip(register.status() !== 201, `the API refused this first name (HTTP ${register.status()})`);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await expect(loginPage.nav.signIn).toBeHidden();
      await expect(page.locator('nav').first()).toContainText('onerror=alert(1)');
      await page.goto('/account');
      await expect(page).toHaveURL(/account/);

      expect(dialogs, 'a stored script must not open a dialog').toEqual([]);
    });
  });
});