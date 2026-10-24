const { test, expect } = require('../../../fixtures/test');
const { uniqueEmail } = require('../../../utils/userFactory');
const data = require('../../../test-data/ui-data.json');

test.describe('Contact form (positive)', () => {
  test.beforeEach(async ({ contactPage }) => {
    await contactPage.goto();
  });

  test('TC182 - shows every field of the contact form', async ({ contactPage }) => {
    const fields = [
      contactPage.firstName, contactPage.lastName, contactPage.email, contactPage.subject,
      contactPage.message, contactPage.attachment, contactPage.submitButton,
    ];

    for (const field of fields) {
      await expect(field).toBeVisible();
    }
  });

  test('TC183 - the subject list offers the customer service option', async ({ contactPage }) => {
    await contactPage.subject.selectOption(data.contact.subject);

    await expect(contactPage.subject).toHaveValue(data.contact.subject);
  });

  test('TC184 - a valid message is accepted by the API', async ({ contactPage }) => {
    await contactPage.fillForm({
      firstName: data.contact.firstName,
      lastName: data.contact.lastName,
      email: uniqueEmail('contact'),
      subject: data.contact.subject,
      message: data.contact.message,
    });

    const response = await contactPage.submitAndWaitForApi();

    expect([200, 201]).toContain(response.status());
  });

  test('TC185 - a required-field error disappears once the field is filled', async ({ contactPage }) => {
    await contactPage.submit();
    await expect(contactPage.error('first-name')).toBeVisible();

    await contactPage.firstName.fill(data.contact.firstName);

    await expect(contactPage.error('first-name')).toBeHidden();
  });
});