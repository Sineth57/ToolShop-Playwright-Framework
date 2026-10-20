const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const { AuthApi } = require('../../../api/AuthApi');
const { buildUserPayload } = require('../../../utils/userFactory');

test.use({ baseURL: API_URL });

test.describe('POST /users/login (negative)', () => {
  test('rejects a registered user with a wrong password', async ({ request }) => {
    const authApi = new AuthApi(request);
    // A throwaway user, so the shared seeded accounts are never locked out
    const user = buildUserPayload();
    const register = await authApi.register(user);
    expect(register.status(), await register.text()).toBe(201);

    const response = await authApi.login(user.email, 'WrongPassword!123');

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.access_token).toBeUndefined();
  });

  test('rejects an email that is not registered', async ({ request }) => {
    const response = await new AuthApi(request).login('nobody-here@example.com', 'SomePassword!123');

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.access_token).toBeUndefined();
  });

  test('rejects an empty request body', async ({ request }) => {
    const response = await request.post('/users/login', { data: {} });

    expect([401, 422]).toContain(response.status());
  });

  test('rejects a login without a password', async ({ request }) => {
    const response = await request.post('/users/login', {
      data: { email: 'nobody-here@example.com' },
    });

    expect([401, 422]).toContain(response.status());
  });
});