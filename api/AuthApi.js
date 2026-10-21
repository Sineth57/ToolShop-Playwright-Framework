const { expect } = require('@playwright/test');
const { buildUserPayload } = require('../utils/userFactory');

class AuthApi {
  constructor(request) {
    this.request = request;
  }

  register(user) {
    return this.request.post('/users/register', { data: user });
  }

  login(email, password) {
    return this.request.post('/users/login', { data: { email, password } });
  }

  bearer(token) {
    return { Authorization: `Bearer ${token}` };
  }

  // Login and returns the bearer token, failing with the server reply if it can't
  async getToken(email, password) {
    const response = await this.login(email, password);
    const text = await response.text();
    expect(response.status(), `Login failed: ${text}`).toBe(200);

    const body = JSON.parse(text);
    expect(body.access_token, 'access_token missing from login response').toBeTruthy();
    return body.access_token;
  }

  // creates a new user, logs in, and returns both
  async registerAndLogin(overrides = {}) {
    const user = buildUserPayload(overrides);
    const response = await this.register(user);
    const text = await response.text();
    expect(response.status(), `Register failed: ${text}`).toBe(201);

    const token = await this.getToken(user.email, user.password);
    return { user, token };
  }

  me(token) {
    return this.request.get('/users/me', { headers: this.bearer(token) });
  }
}

module.exports = { AuthApi };