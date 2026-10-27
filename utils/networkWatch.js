const { expect } = require('@playwright/test');
const { API_URL } = require('./env');

const API_ORIGIN = new URL(API_URL).origin;

// headers a faked api answer needs, so the browser accepts it from another origin
const CORS_HEADERS = { 'access-control-allow-origin': '*' };

// Records every response the page receives from the api, and separately the ones that are server errors 
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
    // waits until the page has asked the api at least once or gives up after timeout
    async firstCall(timeout = 10_000) {
      await expect.poll(() => calls.length, { timeout }).toBeGreaterThan(0).catch(() => {});
    },
  };
}

// collects uncaught js errors of the page
function watchPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

// intercepts the page's requests to the api whose path matches `pathPattern` `respond` receives the route and may fulfill, 
// abort or continue it.
async function mockApi(page, pathPattern, respond) {
  await page.route((url) => url.origin === API_ORIGIN && pathPattern.test(url.pathname), respond);
}

module.exports = { trackApi, watchPageErrors, mockApi, API_ORIGIN, CORS_HEADERS };