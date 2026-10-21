const fs = require('fs');
const { test: setup, expect } = require('@playwright/test');
const { AuthApi } = require('../../api/AuthApi');
const { LoginPage } = require('../../pages/LoginPage');
const { buildUserPayload } = require('../../utils/userFactory');
const { API_URL } = require('../../utils/env');
const { AUTH_DIR, AUTH_FILE, USER_FILE } = require('../../utils/paths');

setup('create a user and save the logged-in browser session', async ({ page, playwright }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Create a brand-new user through the API, so no shared account can be locked out
  const api = await playwright.request.newContext({ baseURL: API_URL });
  const user = buildUserPayload();
  const register = await new AuthApi(api).register(user);
  expect(register.status(), await register.text()).toBe(201);
  await api.dispose();

  // Log in once through the UI
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(user.email, user.password);
  await expect(loginPage.nav.signIn).toBeHidden();

  // Save the session (cookies and localStorage) and the credentials for other tests
  await page.context().storageState({ path: AUTH_FILE });
  fs.writeFileSync(USER_FILE, JSON.stringify({ email: user.email, password: user.password }, null, 2));
});