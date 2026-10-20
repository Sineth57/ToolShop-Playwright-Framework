const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const { uniqueEmail } = require('../../../utils/userFactory');
const data = require('../../../test-data/api-data.json');

test.use({ baseURL: API_URL });

test.describe('Contact messages API (negative)', () => {
  test('rejects an empty request body', async ({ request }) => {
    const response = await request.post('/messages', { data: {} });

    expect(response.status()).toBe(422);
  });

  test('rejects an invalid email address', async ({ request }) => {
    const response = await request.post('/messages', {
      data: {
        name: 'Test User',
        email: 'not-an-email',
        subject: data.contactMessage.subject,
        message: data.contactMessage.message,
      },
    });

    expect(response.status()).toBe(422);
  });

  test('rejects a message without the message text', async ({ request }) => {
    const response = await request.post('/messages', {
      data: {
        name: 'Test User',
        email: uniqueEmail('contact'),
        subject: data.contactMessage.subject,
      },
    });

    expect(response.status()).toBe(422);
  });
});