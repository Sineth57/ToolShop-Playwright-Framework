const { test, expect } = require('../../../fixtures/test');
const data = require('../../../test-data/ui-data.json');

const compare = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });
// const isAscending = (list) => list.length > 1 && list.every((name, i) => i === 0 || compare(list[i - 1], name) <= 0);
// const isDescending = (list) => list.length > 1 && list.every((name, i) => i === 0 || compare(list[i - 1], name) >= 0);

// The first pair of neighbours that breaks the order (null when the whole list is in order)
// function firstViolation(list, direction) {
//   for (let i = 1; i < list.length; i += 1) {
//     const order = compare(list[i - 1], list[i]);
//     if (direction === 'desc' ? order < 0 : order > 0) {
//       return `"${list[i - 1]}" comes before "${list[i]}"`;
//     }
//   }
//   return null;
// }

// // The names the API returns for the first page of a sort
// async function namesFromApi(apiRequest, sort) {
//   const response = await apiRequest.get('/products', { params: { sort, page: 1 } });
//   expect(response.status(), 'GET /products failed').toBe(200);
//   return (await response.json()).data.map((product) => product.name.trim());
// }

// // Waits until the page shows exactly the given names, in that order
// async function expectPageToShow(homePage, expected, sort) {
//   await expect
//     .poll(async () => (await homePage.names()).join(' | '), {
//       message: `the page does not show what the API returns for sort=${sort}: ${expected.join(' | ')}`,
//     })
//     .toBe(expected.join(' | '));
// }



test.describe('Home page (positive)', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test('TC187 - displays product cards on load', async ({ homePage }) => {
    await expect(homePage.productNames.first()).toBeVisible();
  });

  test('TC188 - search filters products by keyword', async ({ homePage }) => {
    await homePage.search('hammer');

    await expect(homePage.productNames.first()).toContainText(/hammer/i);
  });

  for (const { testId, urlPart } of data.categories) {
    test(`category menu opens the ${urlPart} page`, async ({ homePage, page }) => {
      await homePage.nav.openCategory(testId);

      await expect(page).toHaveURL(new RegExp(urlPart));
    });
  }

  test('TC189 - Contact link opens the contact page', async ({ homePage, page }) => {
    await homePage.nav.contact.click();

    await expect(page).toHaveURL(/contact/);
  });

  test('TC190 - Sign in link opens the login page', async ({ homePage, page }) => {
    await homePage.nav.signIn.click();

    await expect(page).toHaveURL(/auth\/login/);
  });

  test('TC191 - Home link returns to the home page', async ({ homePage, page }) => {
    await homePage.nav.contact.click();
    await homePage.nav.home.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(homePage.productNames.first()).toBeVisible();
  });

  //   test('TC192 - sorting by name Z-A puts the products in reverse order', async ({ homePage, apiRequest }) => {
  //   await expect(homePage.productNames.first()).toBeVisible();
  //   const expected = await namesFromApi(apiRequest, 'name,desc');

  //   await homePage.sortBy('name,desc');

  //   // 1. The page shows what the API returns for this sort
  //   await expectPageToShow(homePage, expected, 'name,desc');

  //   // 2. That list really is in Z-A order
  //   const violation = firstViolation(expected, 'desc');
  //   expect(violation, `the list is not in Z-A order: ${violation}. Full list: ${expected.join(' | ')}`).toBeNull();
  // });

  // test('TC193 - sorting by name A-Z puts the products in alphabetical order', async ({ homePage, apiRequest }) => {
  //   await expect(homePage.productNames.first()).toBeVisible();
  //   const descending = await namesFromApi(apiRequest, 'name,desc');
  //   const ascending = await namesFromApi(apiRequest, 'name,asc');

  //   // Go to Z-A first, so the A-Z check can only pass after the sort really changed the list
  //   await homePage.sortBy('name,desc');
  //   await expectPageToShow(homePage, descending, 'name,desc');

  //   await homePage.sortBy('name,asc');
  //   await expectPageToShow(homePage, ascending, 'name,asc');

  //   const violation = firstViolation(ascending, 'asc');
  //   expect(violation, `the list is not in A-Z order: ${violation}. Full list: ${ascending.join(' | ')}`).toBeNull();
  // });

  // test('TC193 - sorting by name A-Z puts the products in alphabetical order', async ({ homePage }) => {
  //   await expect(homePage.productNames.first()).toBeVisible();
  //   await homePage.sortBy('name,desc');
  //   await expect.poll(async () => isDescending(await homePage.names())).toBe(true);

  //   await homePage.sortBy('name,asc');
  //   await expect.poll(async () => isAscending(await homePage.names())).toBe(true);
  // });

  test('TC194 - the next and previous buttons move between pages', async ({ homePage }) => {
    await expect(homePage.productNames.first()).toBeVisible();
    const firstOnPageOne = (await homePage.names())[0];

    await homePage.goToNextPage();
    await expect(homePage.productNames.first()).not.toHaveText(firstOnPageOne);

    await homePage.goToPreviousPage();
    await expect(homePage.productNames.first()).toHaveText(firstOnPageOne);
  });

  test('TC195 - the brand filter shows the products of that brand', async ({ homePage, apiRequest }) => {
    await expect(homePage.productNames.first()).toBeVisible();
    const checkbox = homePage.brandFilters.first();
    const brandId = (await checkbox.getAttribute('data-test')).replace('brand-', '');
    const apiResponse = await apiRequest.get('/products', { params: { by_brand: brandId } });
    const { total, per_page: perPage } = await apiResponse.json();

    await checkbox.check();

    await expect(homePage.productNames).toHaveCount(Math.min(total, perPage));
  });

  test('TC196 - the category filter shows the products of that category', async ({ homePage, apiRequest }) => {
    await expect(homePage.productNames.first()).toBeVisible();

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
      await homePage.categoryFilter(id).uncheck();
    }
    expect(chosen, 'no sub-category with products was found').not.toBeNull();

    await expect(homePage.productNames).toHaveCount(Math.min(chosen.total, chosen.perPage));
  });

  test('TC197 - the eco-friendly filter can be switched on and off again', async ({ homePage }) => {
    await expect(homePage.productNames.first()).toBeVisible();
    const initialCount = await homePage.productNames.count();

    await homePage.ecoFilter.check();
    await expect(homePage.ecoFilter).toBeChecked();
    await homePage.ecoFilter.uncheck();

    await expect(homePage.productNames).toHaveCount(initialCount);
  });

  test('TC198 - the search reset button restores the full list', async ({ homePage }) => {
    await expect(homePage.productNames.first()).toBeVisible();
    const initialCount = await homePage.productNames.count();

    await homePage.search('hammer');
    await expect(homePage.productNames.first()).toContainText(/hammer/i);
    await homePage.searchReset.click();

    await expect(homePage.searchInput).toHaveValue('');
    await expect(homePage.productNames).toHaveCount(initialCount);
  });

  test('TC199 - clicking a product opens its detail page', async ({ homePage, productPage, page }) => {
    await expect(homePage.productNames.first()).toBeVisible();
    const name = (await homePage.names())[0];

    await homePage.productNames.first().click();

    await expect(page).toHaveURL(/\/product\//);
    await expect(productPage.name).toHaveText(name);
  });
});