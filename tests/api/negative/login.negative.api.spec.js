const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const { AuthApi } = require('../../../api/AuthApi');
const { buildUserPayload } = require('../../../utils/userFactory');
const data = require('../../../test-data/api-data.json');

test.use({ baseURL: API_URL });

// most failed logins count
const MAX_FAILED_ATTEMPTS = 10;

async function expectNoToken(response) {
  const body = await response.json().catch(() => ({}));
  expect(body.access_token, 'an error response must not contain a token').toBeUndefined();
}

// creating a throwaway user, so the shared seeded accounts are never locked out
async function registerThrowawayUser(authApi) {
  const user = buildUserPayload();
  const register = await authApi.register(user);
  expect(register.status(), await register.text()).toBe(201);
  return user;
}

test.describe('POST /users/login (negative)', () => {
  test.describe('TC022 - wrong credentials', () => {
    test('rejects a registered user with a wrong password', async ({ request }) => {
      const authApi = new AuthApi(request);
      const user = await registerThrowawayUser(authApi);

      const response = await authApi.login(user.email, 'WrongPassword!123');

      expect(response.status()).toBe(401);
      await expectNoToken(response);
    });

    test('TC023 - rejects an email that is not registered', async ({ request }) => {
      const response = await new AuthApi(request).login('nobody-here@example.com', 'SomePassword!123');

      expect(response.status()).toBe(401);
      await expectNoToken(response);
    });

    test('TC024 - treats the password as case sensitive', async ({ request }) => {
      const authApi = new AuthApi(request);
      const user = await registerThrowawayUser(authApi);

      const response = await authApi.login(user.email, user.password.toUpperCase());

      expect(response.status()).toBe(401);
      await expectNoToken(response);
    });

    test('TC025 - gives the same error for a wrong password and an unknown email', async ({ request }) => {
      const authApi = new AuthApi(request);
      const user = await registerThrowawayUser(authApi);

      const wrongPassword = await authApi.login(user.email, 'WrongPassword!123');
      const unknownEmail = await authApi.login(`nobody.${Date.now()}@example.com`, 'WrongPassword!123');

      expect(wrongPassword.status()).toBe(401);
      expect(unknownEmail.status()).toBe(401);
      expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
    });

    test('TC026 - a single failed attempt does not stop the correct password from working', async ({ request }) => {
      const authApi = new AuthApi(request);
      const user = await registerThrowawayUser(authApi);

      const failed = await authApi.login(user.email, 'WrongPassword!123');
      expect(failed.status()).toBe(401);

      const success = await authApi.login(user.email, user.password);
      expect(success.status()).toBe(200);
    });
  });

  test.describe('invalid input', () => {
    test('TC027 - rejects an empty request body', async ({ request }) => {
      const response = await request.post('/users/login', { data: {} });

      expect([401, 422]).toContain(response.status());
    });

    test('TC028 - rejects a login without a password', async ({ request }) => {
      const response = await request.post('/users/login', {
        data: { email: 'nobody-here@example.com' },
      });

      expect([401, 422]).toContain(response.status());
    });

    for (const { name, data: payload, knownIssue } of data.invalidLoginPayloads) {
      test(`TC029 - rejects a login with ${name}`, async ({ request }) => {
        test.fail(Boolean(knownIssue), knownIssue);
        const response = await request.post('/users/login', { data: payload });
        expect([400, 401, 422]).toContain(response.status());
        await expectNoToken(response);
      });
    }

    test('TC030 - rejects a very long email and password without crashing', async ({ request }) => {
      const response = await request.post('/users/login', {
        data: { email: `${'a'.repeat(300)}@example.com`, password: 'p'.repeat(10_000) },
      });

      expect([400, 401, 413, 422]).toContain(response.status());
      await expectNoToken(response);
    });

    test('TC031 - rejects a request body that is not valid JSON', async ({ request }) => {
      const response = await request.post('/users/login', {
        headers: { 'Content-Type': 'application/json' },
        data: '{"email": "broken"',
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
      await expectNoToken(response);
    });
  });

  test.describe('unsupported requests', () => {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      test(`TC032 - ${method} /users/login is refused and issues no token`, async ({ request }) => {
        const response = await request.fetch('/users/login', { method });

        expect([401, 405]).toContain(response.status());
        await expectNoToken(response);
      });
    }
  });

  test.describe('account protection', () => {
    test('TC033 - locks the account after repeated failed attempts', async ({ request }) => {
      const authApi = new AuthApi(request);
      const user = await registerThrowawayUser(authApi);

      let lockedAfter = null;
      for (let attempt = 1; attempt <= MAX_FAILED_ATTEMPTS; attempt += 1) {
        const response = await authApi.login(user.email, `WrongPassword-${attempt}!`);
        if (response.status() === 423) {
          lockedAfter = attempt;
          break;
        }
        expect(response.status(), `failed attempt ${attempt}`).toBe(401);
      }
      expect(lockedAfter, `the account was not locked after ${MAX_FAILED_ATTEMPTS} failed attempts`).not.toBeNull();

      // when the account is locked even the correct password is refused
      const locked = await authApi.login(user.email, user.password);
      expect(locked.status()).toBe(423);
      await expectNoToken(locked);
    });
  });
});