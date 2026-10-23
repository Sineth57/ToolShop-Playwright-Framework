const { expect } = require('@playwright/test');
const { NavBar } = require('./components/NavBar');

// The site loads its product list with the HTTP QUERY method (a read-only request with a body),
// older code and the API tests use GET, so both are accepted
const LIST_METHODS = ['GET', 'QUERY'];

// The product list of a category (the same product cards as the home page)
class CategoryPage {
  constructor(page) {
    this.page = page;
    this.nav = new NavBar(page);
    this.productNames = page.getByTestId('product-name');
  }

  async names() {
    const texts = await this.productNames.allInnerTexts();
    return texts.map((text) => text.trim());
  }

  // The card of one product, found by its EXACT name: "Pliers" must not match "Combination Pliers".
  // A regular expression anchored at both ends says "exactly this text" (the replace() escapes
  // characters that have a special meaning in a regular expression).
  product(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.productNames.filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) }).first();
  }

  // Opens a category from the menu and returns the product names it shows.
  //
  // Only product list requests sent AFTER the click are considered. If the page asks the API, it
  // counts as ready when it shows exactly what the API answered (this also works when the category
  // list happens to equal the list shown before). If the page sends no request, it counts as ready
  // when the list on screen is not empty and has stopped changing.
  async openFromMenu(categoryTestId) {
    const sentAfterClick = new Set();
    const onRequest = (request) => {
      const isProductList =
        LIST_METHODS.includes(request.method()) && new URL(request.url()).pathname === '/products';
      if (isProductList) sentAfterClick.add(request);
    };
    this.page.on('request', onRequest);

    try {
      // Registered before the click, so a fast answer cannot be missed. Gives up after 10 seconds.
      const answer = this.page
        .waitForResponse((response) => sentAfterClick.has(response.request()) && response.ok(), { timeout: 10_000 })
        .catch(() => null);

      await this.nav.openCategory(categoryTestId);
      await expect(this.page).toHaveURL(new RegExp(categoryTestId.replace('nav-', '')));

      const response = await answer;
      if (response) return this.expectListToMatch(response);
      return this.waitForStableList();
    } finally {
      this.page.off('request', onRequest);
    }
  }

  // The page must show exactly what the API answered
  async expectListToMatch(response) {
    const body = await response.json();
    const products = Array.isArray(body) ? body : body.data;
    const expected = products.map((product) => product.name.trim());
    expect(expected.length, 'the API returned no products for the category').toBeGreaterThan(0);

    await expect
      .poll(async () => (await this.names()).join('|'), {
        timeout: 30_000,
        message: `the list on the page does not match the API's answer: ${expected.join(', ')}`,
      })
      .toBe(expected.join('|'));
    return expected;
  }

  // Used when the page sent no product request: waits until the list is not empty and unchanged
  // between two checks
  async waitForStableList() {
    let previous = '';
    let shown = [];
    await expect
      .poll(
        async () => {
          shown = await this.names();
          const now = shown.join('|');
          const stable = now !== '' && now === previous;
          previous = now;
          return stable;
        },
        {
          intervals: [500, 1000],
          timeout: 30_000,
          message: 'the product list of the category did not appear or kept changing',
        },
      )
      .toBe(true);
    return shown;
  }
}

module.exports = { CategoryPage };