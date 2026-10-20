const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');

test.use({ baseURL: API_URL });

const INVALID_TOKEN = { Authorization: 'Bearer invalid.token.value' };

test.describe('Protected routes (negative)', () => {
  test('GET /users/me without a token returns 401', async ({ request }) => {
    const response = await request.get('/users/me');

    expect(response.status()).toBe(401);
  });

  test('GET /users/me with an invalid token returns 401', async ({ request }) => {
    const response = await request.get('/users/me', { headers: INVALID_TOKEN });

    expect(response.status()).toBe(401);
  });

  test('GET /invoices without a token returns 401', async ({ request }) => {
    const response = await request.get('/invoices');

    expect(response.status()).toBe(401);
  });

  test('GET /invoices with an invalid token returns 401', async ({ request }) => {
    const response = await request.get('/invoices', { headers: INVALID_TOKEN });

    expect(response.status()).toBe(401);
  });
});