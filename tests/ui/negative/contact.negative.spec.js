const { test, expect } = require('../../../fixtures/test');
const { uniqueEmail } = require('../../../utils/userFactory');
const data = require('../../../test-data/ui-data.json');

const validForm = () => ({
  firstName: data.contact.firstName,
  lastName: data.contact.lastName,
  email: uniqueEmail('contact'),
  subject: data.contact.subject,
  message: data.contact.message,
});

test.describe('Contact form (negative)', () => {
  test.beforeEach(async ({ contactPage }) => {
    await contactPage.goto();
  });

  for (const { field, errorId, text } of data.contactRequiredFields) {
    test(`TC098 - an empty form shows "${text}" for ${field}`, async ({ contactPage }) => {
      await contactPage.submit();

      await expect(contactPage.page.getByTestId(errorId)).toContainText(text);
    });
  }

  test('TC099 - an invalid email address shows an email error', async ({ contactPage }) => {
    await contactPage.fillForm({ ...validForm(), email: 'not-an-email' });
    await contactPage.submit();

    await expect(contactPage.error('email')).toBeVisible();
  });

  test('TC100 - a very short message shows a message error', async ({ contactPage }) => {
    // assume the form enforces a minimum message length
    await contactPage.fillForm({ ...validForm(), message: data.contact.shortMessage });
    await contactPage.submit();

    await expect(contactPage.error('message')).toBeVisible();
  });

  test('TC101 - an invalid form is not sent to the API', async ({ contactPage, page }) => {
    let apiCalled = false;
    page.on('request', (request) => {
      if (request.url().includes('/messages') && request.method() === 'POST') apiCalled = true;
    });

    await contactPage.submit();
    await expect(contactPage.error('first-name')).toBeVisible();

    expect(apiCalled).toBe(false);
  });
});