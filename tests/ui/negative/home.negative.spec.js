const { test, expect } = require('../../../fixtures/test');
const { watchDialogs } = require('../../../utils/formMessages');
const { API_URL } = require('../../../utils/env');
const data = require('../../../test-data/home-negative-data.json');

const apiOrigin = new URL(API_URL).origin;

// Collects every answer of the API that is a server error (5xx), so a test can prove there was none
function trackServerErrors(page) {
  const errors = [];
  page.on('response', (response) => {
    if (response.url().startsWith(apiOrigin) && response.status() >= 500) {
      errors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return errors;
}

// Searches and gives the API a moment to answer. The wait is soft on purpose: some inputs
// (an empty box, only spaces) may not send a request at all, and that is not a failure.
async function searchAndSettle(homePage, page, text) {
  const answered = page
    .waitForResponse((r) => r.url().startsWith(apiOrigin) && r.request().method() === 'GET', { timeout: 5_000 })
    .catch(() => null);
  await homePage.search(text);
  await answered;
}

test.describe('Home page (negative)', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.productNames.first()).toBeVisible();
  });

  test('a search with no matches shows no products', async ({ homePage }) => {
    await homePage.search('zzzzqqqqxxxx');

    await expect(homePage.productNames).toHaveCount(0);
  });

  // Unusual text must neither crash the API nor leave the page unusable
  for (const { name, value } of data.searchInputs) {
    test(`searching for ${name} does not break the page`, async ({ homePage, page }) => {
      const serverErrors = trackServerErrors(page);

      await searchAndSettle(homePage, page, value);

      expect(serverErrors, 'the API must not answer with a server error').toEqual([]);
      await homePage.searchReset.click();
      await expect(homePage.searchInput).toHaveValue('');
      await expect(homePage.productNames.first()).toBeVisible();
    });
  }

  for (const length of data.longInputLengths) {
    test(`searching for a text of ${length} characters does not break the page`, async ({ homePage, page }) => {
      const serverErrors = trackServerErrors(page);

      await searchAndSettle(homePage, page, 'a'.repeat(length));

      expect(serverErrors, 'the API must not answer with a server error').toEqual([]);
      await homePage.searchReset.click();
      await expect(homePage.productNames.first()).toBeVisible();
    });
  }

  for (const { name, value } of data.scriptInputs) {
    test(`script text in the search box (${name}) does not run`, async ({ homePage, page }) => {
      const dialogs = watchDialogs(page);

      await searchAndSettle(homePage, page, value);

      expect(dialogs, 'a script in the search must not open a dialog').toEqual([]);
      await expect(page.locator('img[src="x"]'), 'typed text must not become page elements').toHaveCount(0);
    });
  }

  test('searching with an empty box keeps the full product list', async ({ homePage, page }) => {
    const initialCount = await homePage.productNames.count();

    await searchAndSettle(homePage, page, '');

    await expect(homePage.productNames).toHaveCount(initialCount);
  });

  test('a search is not case sensitive', async ({ homePage }) => {
    await homePage.search('HAMMER');

    await expect(homePage.productNames.first()).toContainText(/hammer/i);
  });

  test('spaces around the search text are ignored', async ({ homePage }) => {
    await homePage.search('  hammer  ');

    await expect(homePage.productNames.first()).toContainText(/hammer/i);
  });

  test('double-clicking Search does not duplicate products or fail', async ({ homePage, page }) => {
    const serverErrors = trackServerErrors(page);
    await homePage.searchInput.fill('hammer');

    await homePage.searchButton.dblclick();

    await expect(homePage.productNames.first()).toContainText(/hammer/i);
    const names = await homePage.names();
    expect(new Set(names).size, 'a product must be listed only once').toBe(names.length);
    expect(serverErrors, 'the API must not answer with a server error').toEqual([]);
  });
});