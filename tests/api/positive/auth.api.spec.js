const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const { AuthApi } = require('../../../api/AuthApi');
const { buildUserPayload } = require('../../../utils/userFactory');

test.use({ baseURL: API_URL });

test.describe('Authentication API (positive)', () => {
  test('registers a new user and does not expose the password', async ({ request }) => {
    const authApi = new AuthApi(request);
    const user = buildUserPayload();

    const response = await authApi.register(user);
    const text = await response.text();
    expect(response.status(), `Register failed: ${text}`).toBe(201);
    expect(JSON.parse(text).password).toBeUndefined();
  });

  test('login returns a bearer token with an expiry', async ({ request }) => {
    const authApi = new AuthApi(request);
    const user = buildUserPayload();
    await authApi.register(user);

    const response = await authApi.login(user.email, user.password);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(typeof body.access_token).toBe('string');
    expect(body.token_type).toMatch(/bearer/i);
    expect(typeof body.expires_in).toBe('number');
  });

  test('registers, logs in and reads the profile', async ({ request }) => {
    const authApi = new AuthApi(request);
    const { user, token } = await authApi.registerAndLogin();

    const me = await authApi.me(token);
    expect(me.status()).toBe(200);
    const profile = await me.json();
    expect(profile.email).toBe(user.email);
  });

  test('a valid token grants access to the invoices list', async ({ request }) => {
    const authApi = new AuthApi(request);
    const { token } = await authApi.registerAndLogin();

    const response = await request.get('/invoices', { headers: authApi.bearer(token) });
    expect(response.status()).toBe(200);
  });
});