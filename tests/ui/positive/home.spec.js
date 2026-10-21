const { test, expect } = require('../../../fixtures/test');
const data = require('../../../test-data/ui-data.json');

const compare = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });
// A list still being redrawn can be empty, so require more than one name
const isAscending = (list) => list.length > 1 && list.every((name, i) => i === 0 || compare(list[i - 1], name) <= 0);
const isDescending = (list) => list.length > 1 && list.every((name, i) => i === 0 || compare(list[i - 1], name) >= 0);

test.describe('Home page (positive)', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test('displays product cards on load', async ({ homePage }) => {
    await expect(homePage.productNames.first()).toBeVisible();
  });

  test('search filters products by keyword', async ({ homePage }) => {
    await homePage.search('hammer');

    await expect(homePage.productNames.first()).toContainText(/hammer/i);
  });

  for (const { testId, urlPart } of data.categories) {
    test(`category menu opens the ${urlPart} page`, async ({ homePage, page }) => {
      await homePage.nav.openCategory(testId);

      await expect(page).toHaveURL(new RegExp(urlPart));
    });
  }

  test('Contact link opens the contact page', async ({ homePage, page }) => {
    await homePage.nav.contact.click();

    await expect(page).toHaveURL(/contact/);
  });

  test('Sign in link opens the login page', async ({ homePage, page }) => {
    await homePage.nav.signIn.click();

    await expect(page).toHaveURL(/auth\/login/);
  });

  test('Home link returns to the home page', async ({ homePage, page }) => {
    await homePage.nav.contact.click();
    await homePage.nav.home.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(homePage.productNames.first()).toBeVisible();
  });

  test('sorting by name Z-A puts the products in reverse order', async ({ homePage }) => {
    await expect(homePage.productNames.first()).toBeVisible();
    await homePage.sortBy('name,desc');

    await expect.poll(async () => isDescending(await homePage.names())).toBe(true);
  });

  test('sorting by name A-Z puts the products in alphabetical order', async ({ homePage }) => {
    await expect(homePage.productNames.first()).toBeVisible();
    // Go to Z-A first, so the A-Z check can only pass after the sort really changed the list
    await homePage.sortBy('name,desc');
    await expect.poll(async () => isDescending(await homePage.names())).toBe(true);

    await homePage.sortBy('name,asc');
    await expect.poll(async () => isAscending(await homePage.names())).toBe(true);
  });

  test('the next and previous buttons move between pages', async ({ homePage }) => {
    await expect(homePage.productNames.first()).toBeVisible();
    const firstOnPageOne = (await homePage.names())[0];

    await homePage.goToNextPage();
    await expect(homePage.productNames.first()).not.toHaveText(firstOnPageOne);

    await homePage.goToPreviousPage();
    await expect(homePage.productNames.first()).toHaveText(firstOnPageOne);
  });

  test('the brand filter shows the products of that brand', async ({ homePage, apiRequest }) => {
    await expect(homePage.productNames.first()).toBeVisible();
    const checkbox = homePage.brandFilters.first();
    const brandId = (await checkbox.getAttribute('data-test')).replace('brand-', '');

    // Expected result comes from the API
    const apiResponse = await apiRequest.get('/products', { params: { by_brand: brandId } });
    const { total, per_page: perPage } = await apiResponse.json();

    await checkbox.check();

    await expect(homePage.productNames).toHaveCount(Math.min(total, perPage));
  });

  test('the category filter shows the products of that category', async ({ homePage, apiRequest }) => {
    await expect(homePage.productNames.first()).toBeVisible();

    // Ticking a parent category (e.g. Hand Tools) also ticks all its sub-categories, so the page then
    // shows more products than the API reports for the parent id alone. Only a category that ticks
    // by itself (a sub-category) can be compared with the API's count for that one id.
    let chosen = null;
    for (const id of await homePage.categoryIds()) {
      const response = await apiRequest.get('/products', { params: { by_category: id } });
      const body = await response.json();
      if (body.total === 0) continue;

      await homePage.categoryFilter(id).check();
      if ((await homePage.checkedCategoryCount()) === 1) {
        chosen = { id, total: body.total, perPage: body.per_page };
        break;
      }
      // A parent category: clear it again and try the next one
      await homePage.categoryFilter(id).uncheck();
    }
    expect(chosen, 'no sub-category with products was found').not.toBeNull();

    await expect(homePage.productNames).toHaveCount(Math.min(chosen.total, chosen.perPage));
  });

  test('the eco-friendly filter can be switched on and off again', async ({ homePage }) => {
    await expect(homePage.productNames.first()).toBeVisible();
    const initialCount = await homePage.productNames.count();

    await homePage.ecoFilter.check();
    await expect(homePage.ecoFilter).toBeChecked();
    await homePage.ecoFilter.uncheck();

    await expect(homePage.productNames).toHaveCount(initialCount);
  });

  test('the search reset button restores the full list', async ({ homePage }) => {
    await expect(homePage.productNames.first()).toBeVisible();
    const initialCount = await homePage.productNames.count();

    await homePage.search('hammer');
    await expect(homePage.productNames.first()).toContainText(/hammer/i);
    await homePage.searchReset.click();

    await expect(homePage.searchInput).toHaveValue('');
    await expect(homePage.productNames).toHaveCount(initialCount);
  });

  test('clicking a product opens its detail page', async ({ homePage, productPage, page }) => {
    await expect(homePage.productNames.first()).toBeVisible();
    const name = (await homePage.names())[0];

    await homePage.productNames.first().click();

    await expect(page).toHaveURL(/\/product\//);
    await expect(productPage.name).toHaveText(name);
  });
});