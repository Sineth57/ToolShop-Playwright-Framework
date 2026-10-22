const { expect } = require('@playwright/test');
const { API_URL } = require('./env');

const API_ORIGIN = new URL(API_URL).origin;

// Headers a faked API answer needs, so the browser accepts it from another origin
const CORS_HEADERS = { 'access-control-allow-origin': '*' };

// Records every response the page receives from the API, and separately the ones that are
// server errors (HTTP 5xx)
function trackApi(page) {
  const calls = [];
  const serverErrors = [];
  page.on('response', (response) => {
    if (!response.url().startsWith(API_ORIGIN)) return;
    const line = `${response.status()} ${response.request().method()} ${response.url()}`;
    calls.push(line);
    if (response.status() >= 500) serverErrors.push(line);
  });
  return {
    calls,
    serverErrors,
    // Waits until the page has asked the API at least once (or gives up after `timeout` ms)
    async firstCall(timeout = 10_000) {
      await expect.poll(() => calls.length, { timeout }).toBeGreaterThan(0).catch(() => {});
    },
  };
}

// Collects uncaught JavaScript errors of the page
function watchPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

// Intercepts the page's requests to the API whose path matches `pathPattern` (a RegExp).
// `respond` receives the route and may fulfill, abort or continue it.
async function mockApi(page, pathPattern, respond) {
  await page.route((url) => url.origin === API_ORIGIN && pathPattern.test(url.pathname), respond);
}

module.exports = { trackApi, watchPageErrors, mockApi, API_ORIGIN, CORS_HEADERS };