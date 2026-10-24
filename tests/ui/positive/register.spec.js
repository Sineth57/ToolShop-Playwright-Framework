const { test, expect } = require('../../../fixtures/test');
const { uniqueEmail } = require('../../../utils/userFactory');
const data = require('../../../test-data/ui-data.json');

test.describe('Registration (positive)', () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test('TC211 - shows every field of the registration form', async ({ registerPage }) => {
    const fields = [
      registerPage.firstName, registerPage.lastName, registerPage.dob, registerPage.country,
      registerPage.postalCode, registerPage.houseNumber, registerPage.street, registerPage.city,
      registerPage.state, registerPage.phone, registerPage.email, registerPage.password,
      registerPage.submitButton,
    ];

    for (const field of fields) {
      await expect(field).toBeVisible();
    }
  });

  test('TC212 - a new user can register and is sent to the login page', async ({ registerPage, page }) => {
    await registerPage.fillForm({ ...data.registration, email: uniqueEmail('ui') });
    await registerPage.submit();

    await expect(page).toHaveURL(/auth\/login/);
  });
});