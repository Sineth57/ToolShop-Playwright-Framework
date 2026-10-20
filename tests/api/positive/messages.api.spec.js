const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const { uniqueEmail } = require('../../../utils/userFactory');
const data = require('../../../test-data/api-data.json');

test.use({ baseURL: API_URL });

test.describe('Contact messages API (positive)', () => {
  test('submits a contact message', async ({ request }) => {
    const response = await request.post('/messages', {
      data: {
        name: 'Test User',
        email: uniqueEmail('contact'),
        subject: data.contactMessage.subject,
        message: data.contactMessage.message,
      },
    });

    const text = await response.text();
    expect([200, 201], `Unexpected reply: ${text}`).toContain(response.status());
  });
});