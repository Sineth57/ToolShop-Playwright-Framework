const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const { AuthApi } = require('../../../api/AuthApi');
const { buildUserPayload } = require('../../../utils/userFactory');
const { setPath, removePath } = require('../../../utils/objectPath');
const data = require('../../../test-data/register-data.json');

test.use({ baseURL: API_URL });

const VALIDATION_ERROR = [400, 422];

// valid user with one field changed
function userWith(path, value) {
  return setPath(buildUserPayload(), path, value);
}

test.describe('POST /users/register (negative)', () => {
  test.describe('basic validation', () => {
    test('TC047 - rejects an empty request body', async ({ request }) => {
      const response = await request.post('/users/register', { data: {} });

      expect(response.status()).toBe(422);
    });

    test('TC048 - rejects an invalid email format', async ({ request }) => {
      // keeps the expected behaviour 422
      test.fail(true, 'Known issue -> API accepts a malformed email address');

      const response = await new AuthApi(request).register(buildUserPayload({ email: 'not-an-email' }));

      expect(response.status()).toBe(422);
    });

    test('TC049 - rejects a weak password', async ({ request }) => {
      const response = await new AuthApi(request).register(buildUserPayload({ password: 'abc' }));

      expect(response.status()).toBe(422);
    });

    test('TC050 - rejects a registration without a first name', async ({ request }) => {
      const user = buildUserPayload();
      delete user.first_name;

      const response = await new AuthApi(request).register(user);
      expect(response.status()).toBe(422);
    });

    test('TC051 - rejects a second registration with the same email with 409', async ({ request }) => {
      const authApi = new AuthApi(request);
      const user = buildUserPayload();

      const first = await authApi.register(user);
      expect(first.status(), await first.text()).toBe(201);

      const second = await authApi.register(user);
      expect(second.status()).toBe(409);
    });
  });

  test.describe('missing and empty fields', () => {
    for (const { name, path, knownIssue } of data.requiredFields) {
      test(`TC052 - rejects a registration without a ${name}`, async ({ request }) => {

        test.fail(Boolean(knownIssue), knownIssue);

        const user = removePath(buildUserPayload(), path);

        const response = await new AuthApi(request).register(user);

        expect(response.status()).toBe(422);
      });
    }

    for (const { name, path, value } of data.blankValues) {
      test(`TC053 - rejects ${name}`, async ({ request }) => {
        const response = await new AuthApi(request).register(userWith(path, value));

        expect(response.status()).toBe(422);
      });
    }
  });

  test.describe('invalid values', () => {
    for (const { name, value } of data.weakPasswords) {
      test(`TC053 - rejects ${name}`, async ({ request }) => {
        // assuming api enforces length, capital letters, numbers, special characters
        const response = await new AuthApi(request).register(userWith('password', value));

        expect(response.status()).toBe(422);
      });
    }

    for (const { name, value, knownIssue } of data.invalidEmails) {
      test(`TC054 - rejects ${name}`, async ({ request }) => {
        test.fail(Boolean(knownIssue), knownIssue);

        const response = await new AuthApi(request).register(userWith('email', value));

        expect(response.status()).toBe(422);
      });
    }

    for (const { name, value } of data.invalidDates) {
      test(`TC055 - rejects ${name} as the date of birth`, async ({ request }) => {
        const response = await new AuthApi(request).register(userWith('dob', value));

        expect(response.status()).toBe(422);
      });
    }
  });

  test.describe('wrong data types', () => {
    
    for (const { name, path, value, knownIssue } of data.wrongTypes) {
      test(`TC056 - rejects ${name}`, async ({ request }) => {
        test.fail(Boolean(knownIssue), knownIssue);

        const response = await new AuthApi(request).register(userWith(path, value));

        expect(VALIDATION_ERROR).toContain(response.status());
      });
    }
  });

  test.describe('size limits', () => {
    for (const { name, path, length, suffix = '' } of data.longValues) {
      test(`TC057 - rejects a ${name} that is ${length} characters long`, async ({ request }) => {
        const response = await new AuthApi(request).register(userWith(path, `${'a'.repeat(length)}${suffix}`));

        expect([...VALIDATION_ERROR, 413]).toContain(response.status());
      });
    }
  });

  test.describe('special characters', () => {
    for (const { name, value } of data.specialTexts) {
      test(`TC058 - does not crash when the first name is ${name}`, async ({ request }) => {
        const response = await new AuthApi(request).register(userWith('first_name', value));

        expect(response.status()).toBeLessThan(500);
      });
    }
  });

  test.describe('account integrity', () => {
    test('TC059 - rejects the same email written in capital letters', async ({ request }) => {
      const authApi = new AuthApi(request);
      const user = buildUserPayload();
      const first = await authApi.register(user);
      expect(first.status(), await first.text()).toBe(201);

      const second = await authApi.register({ ...user, email: user.email.toUpperCase() });

      expect(second.status()).toBe(409);
    });

    test('TC060 - a second registration does not change the password of the existing account', async ({ request }) => {
      const authApi = new AuthApi(request);
      const user = buildUserPayload();
      const first = await authApi.register(user);
      expect(first.status(), await first.text()).toBe(201);

      const attempt = await authApi.register({ ...user, password: 'An0ther!Pass#2026' });
      expect(attempt.status()).toBe(409);

      expect((await authApi.login(user.email, user.password)).status()).toBe(200);
      expect((await authApi.login(user.email, 'An0ther!Pass#2026')).status()).toBe(401);
    });

    test('TC061 - a rejected registration does not create an account', async ({ request }) => {
      const authApi = new AuthApi(request);
      const user = buildUserPayload({ password: 'qz1' });

      const register = await authApi.register(user);
      expect(register.status()).toBe(422);

      const login = await authApi.login(user.email, 'qz1');
      expect(login.status()).toBe(401);
    });

    test('TC062 - an error response does not repeat the submitted password', async ({ request }) => {
      const password = 'qz1';

      const response = await new AuthApi(request).register(buildUserPayload({ password }));

      expect(response.status()).toBe(422);
      expect(await response.text()).not.toContain(password);
    });
  });

  test.describe('unsupported requests', () => {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      test(`TC063 - ${method} /users/register is refused`, async ({ request }) => {
        const response = await request.fetch('/users/register', { method });

        expect([401, 404, 405]).toContain(response.status());
      });
    }

    test('TC064 - rejects a request body that is not valid JSON', async ({ request }) => {
      const response = await request.post('/users/register', {
        headers: { 'Content-Type': 'application/json' },
        data: '{"first_name": "broken"',
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });
});