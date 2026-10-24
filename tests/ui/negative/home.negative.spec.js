const { test, expect } = require('../../../fixtures/test');
const { expectErrorMessage, watchDialogs } = require('../../../utils/formMessages');
const { trackApi, watchPageErrors } = require('../../../utils/networkWatch');
const { API_URL } = require('../../../utils/env');
const data = require('../../../test-data/home-negative-data.json');

const API_ORIGIN = new URL(API_URL).origin;
const CORS = { 'access-control-allow-origin': '*' };

async function expectHandled(homePage, tracker, dialogs = []) {
  await expect
    .poll(() => tracker.calls.length, { timeout: 10_000 })
    .toBeGreaterThan(0)
    .catch(() => {});
  try {
    await expect(homePage.productNames.first().or(homePage.noResults)).toBeVisible();
  } finally {
    expect(tracker.serverErrors, 'the API answered with a server error').toEqual([]);
    expect(dialogs, 'a script in the input must not open a dialog').toEqual([]);
  }
}

// replaces the answers of the product list request
async function mockProductList(page, respond) {
  await page.route((url) => url.origin === API_ORIGIN && url.pathname === '/products', respond);
}

async function expectSiteStillUsable(homePage, page) {
  await expect(homePage.nav.contact).toBeVisible();
  await expect(homePage.productNames).toHaveCount(0);
  await homePage.nav.contact.click();
  await expect(page).toHaveURL(/contact/);
}

async function attachPageErrors(errors) {
  await test.info().attach('uncaught page errors', {
    body: errors.join('\n') || 'none',
    contentType: 'text/plain',
  });
}

test.describe('Home page (negative)', () => {
  test.describe('search input', () => {
    test.beforeEach(async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productNames.first()).toBeVisible();
    });

    for (const { name, value } of data.searchTerms) {
      test(`TC102 - searching for ${name} is handled safely`, async ({ homePage, page }) => {
        const dialogs = watchDialogs(page);
        const tracker = trackApi(page);

        await homePage.search(value);

        await expectHandled(homePage, tracker, dialogs);
      });
    }

    test('TC103 - searching for a very long text is handled safely', async ({ homePage, page }) => {
      const tracker = trackApi(page);

      await homePage.search('a'.repeat(300));

      await expectHandled(homePage, tracker);
    });

    test('TC104 - submitting an empty search shows the full list again', async ({ homePage }) => {
      const initialCount = await homePage.productNames.count();

      await homePage.searchInput.fill('');
      await homePage.searchButton.click();

      await expect(homePage.productNames).toHaveCount(initialCount);
    });
  });

  test.describe('empty results', () => {
    test.beforeEach(async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productNames.first()).toBeVisible();
    });

    test('TC105 - a search with no matches shows no products', async ({ homePage }) => {
      await homePage.search('zzzzqqqqxxxx');

      await expect(homePage.productNames).toHaveCount(0);
      await expectErrorMessage(homePage.noResults, 'home: empty search result');
    });

    test('TC106 - the reset button brings the products back after an empty result', async ({ homePage }) => {
      const initialCount = await homePage.productNames.count();
      await homePage.search('zzzzqqqqxxxx');
      await expect(homePage.productNames).toHaveCount(0);

      await homePage.searchReset.click();

      await expect(homePage.productNames).toHaveCount(initialCount);
    });

    test('TC107 - switching on the eco-friendly filter on an empty result does not break the page', async ({ homePage, page }) => {
      await homePage.search('zzzzqqqqxxxx');
      await expect(homePage.productNames).toHaveCount(0);
      const tracker = trackApi(page);

      await homePage.ecoFilter.check();

      await expect(homePage.ecoFilter).toBeChecked();
      await expect(homePage.productNames).toHaveCount(0);
      expect(tracker.serverErrors, 'the API answered with a server error').toEqual([]);
    });

    test('TC108 - sorting an empty result does not break the page', async ({ homePage, page }) => {
      await homePage.search('zzzzqqqqxxxx');
      await expect(homePage.productNames).toHaveCount(0);
      const tracker = trackApi(page);

      await homePage.sortBy('price,asc');

      await expect(homePage.productNames).toHaveCount(0);
      await expect(homePage.sortSelect).toHaveValue('price,asc');
      expect(tracker.serverErrors, 'the API answered with a server error').toEqual([]);
    });
  });

  test.describe('pagination limits', () => {
    test.beforeEach(async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productNames.first()).toBeVisible();
    });

    test('TC109 - the previous button cannot be used on the first page', async ({ homePage }) => {
      const disabled = await homePage.isDisabled(homePage.previousPage);

      expect(disabled, 'the "previous" button is still active on the first page').toBe(true);
    });

    // test('the next button cannot be used on the last page', async ({ homePage, apiRequest }) => {
    //   test.setTimeout(120_000);
    //   const { last_page: lastPage } = await (await apiRequest.get('/products')).json();
    //   test.skip(lastPage < 2, 'the catalogue has only one page');

    //   // Click through to the last page, waiting for each page to show different products
    //   for (let step = 1; step < lastPage; step += 1) {
    //     const before = (await homePage.names())[0];
    //     await homePage.goToNextPage();
    //     await expect(homePage.productNames.first()).not.toHaveText(before);
    //   }

    //   const disabled = await homePage.isDisabled(homePage.nextPage);
    //   expect(disabled, 'the "next" button is still active on the last page').toBe(true);
    // });

       test('TC110 - the next button cannot be used on the last page', async ({ homePage }) => {
      test.setTimeout(120_000);
      const MAX_PAGES = 50; 
      let pagesVisited = 1;
      while (!(await homePage.isDisabled(homePage.nextPage)) && pagesVisited < MAX_PAGES) {
        const before = (await homePage.names())[0];
        await homePage.goToNextPage();
        await expect(homePage.productNames.first()).not.toHaveText(before);
        pagesVisited += 1;
      }
      test.skip(pagesVisited === 1, 'the catalogue has only one page');

      const disabled = await homePage.isDisabled(homePage.nextPage);
      expect(disabled, `the "next" button is still active after ${pagesVisited} pages`).toBe(true);
    });


  });

  test.describe('price slider', () => {
    test('TC111 - moving the maximum price down to the minimum does not break the page', async ({ homePage, page }) => {
      await homePage.goto();
      await expect(homePage.productNames.first()).toBeVisible();
      const tracker = trackApi(page);

      await homePage.maxPriceSlider.focus();
      await homePage.maxPriceSlider.press('Home');

      await expectHandled(homePage, tracker);
    });
  });

  test.describe('unknown addresses', () => {
    for (const { name, path } of data.unknownAddresses) {
      test(`TC112 - ${name} does not break the site`, async ({ homePage, page }) => {
        const dialogs = watchDialogs(page);
        const tracker = trackApi(page);

        const response = await page.goto(path);

        expect(response.status(), 'the web server itself failed').toBeLessThan(500);
        await expect(homePage.nav.home).toBeVisible();
        await test.info().attach(`address: ${name}`, {
          body: `requested ${path}\nended up at ${page.url()}`,
          contentType: 'text/plain',
        });
        expect(tracker.serverErrors, 'the API answered with a server error').toEqual([]);
        expect(dialogs, 'a script in the address must not open a dialog').toEqual([]);
      });
    }
  });

  test.describe('problems with the product API (simulated)', () => {
    test('TC113 - a server error (HTTP 500) leaves the site usable', async ({ homePage, page }) => {
      const pageErrors = watchPageErrors(page);
      await mockProductList(page, (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          headers: CORS,
          body: JSON.stringify({ message: 'Server Error' }),
        }),
      );

      await homePage.goto();

      await expectSiteStillUsable(homePage, page);
      await attachPageErrors(pageErrors);
    });

    test('TC114 - a failed network connection leaves the site usable', async ({ homePage, page }) => {
      const pageErrors = watchPageErrors(page);
      await mockProductList(page, (route) => route.abort('failed'));

      await homePage.goto();

      await expectSiteStillUsable(homePage, page);
      await attachPageErrors(pageErrors);
    });

    test('TC115 - an answer that is not valid JSON leaves the site usable', async ({ homePage, page }) => {
      const pageErrors = watchPageErrors(page);
      await mockProductList(page, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: CORS,
          body: 'this is not json',
        }),
      );

      await homePage.goto();

      await expectSiteStillUsable(homePage, page);
      await attachPageErrors(pageErrors);
    });

    test('TC116 - an empty product list shows the "no results" state without errors', async ({ homePage, page }) => {
      const pageErrors = watchPageErrors(page);
      await mockProductList(page, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: CORS,
          body: JSON.stringify({
            current_page: 1, data: [], from: null, last_page: 1, per_page: 9, to: null, total: 0,
          }),
        }),
      );

      await homePage.goto();

      await expect(homePage.productNames).toHaveCount(0);
      await expectErrorMessage(homePage.noResults, 'home: no products in the catalogue');
      await attachPageErrors(pageErrors);
      expect(pageErrors, 'an empty list must not cause JavaScript errors').toEqual([]);
    });
  });
});