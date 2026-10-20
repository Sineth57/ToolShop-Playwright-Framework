const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const { AuthApi } = require('../../../api/AuthApi');
const { buildUserPayload } = require('../../../utils/userFactory');

test.use({ baseURL: API_URL });

test.describe('POST /users/register (negative)', () => {
  test('rejects an empty request body', async ({ request }) => {
    const response = await request.post('/users/register', { data: {} });

    expect(response.status()).toBe(422);
  });

  test('rejects an invalid email format', async ({ request }) => {
    // Known issue: the API currently accepts a malformed email and returns 201.
    // test.fail() keeps the expected behaviour (422) and flags the test when the bug is fixed.
    test.fail(true, 'Known issue: API accepts a malformed email address');

    const response = await new AuthApi(request).register(buildUserPayload({ email: 'not-an-email' }));

    expect(response.status()).toBe(422);
  });

  test('rejects a weak password', async ({ request }) => {
    const response = await new AuthApi(request).register(buildUserPayload({ password: 'abc' }));

    expect(response.status()).toBe(422);
  });

  test('rejects a registration without a first name', async ({ request }) => {
    const user = buildUserPayload();
    delete user.first_name;

    const response = await new AuthApi(request).register(user);
    expect(response.status()).toBe(422);
  });

  test('rejects a second registration with the same email with 409', async ({ request }) => {
    const authApi = new AuthApi(request);
    const user = buildUserPayload();

    const first = await authApi.register(user);
    expect(first.status(), await first.text()).toBe(201);

    const second = await authApi.register(user);
    expect(second.status()).toBe(409);
  });
});