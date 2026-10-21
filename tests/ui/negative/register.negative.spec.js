const { test, expect } = require('../../../fixtures/test');
const { uniqueEmail } = require('../../../utils/userFactory');
const data = require('../../../test-data/ui-data.json');

test.describe('Registration (negative)', () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  for (const { field, errorId } of data.registerRequiredFields) {
    test(`an empty form shows a required error for ${field}`, async ({ registerPage }) => {
      await registerPage.submit();

      await expect(registerPage.error(errorId)).toBeVisible();
    });
  }

  test('a weak password is rejected and the user stays on the registration page', async ({ registerPage, page }) => {
    await registerPage.fillForm({
      ...data.registration,
      email: uniqueEmail('ui'),
      password: data.weakPassword,
    });
    await registerPage.submit();

    await expect(registerPage.error('password-error')).toBeVisible();
    await expect(page).toHaveURL(/auth\/register/);
  });
});