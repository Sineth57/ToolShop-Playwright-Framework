const { expect } = require('@playwright/test');
const { NavBar } = require('./components/NavBar');

// code and the API tests use get. so both are accepted
const LIST_METHODS = ['GET', 'QUERY'];

// the product list of a category
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


  product(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.productNames.filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) }).first();
  }

  // Opens a category from the menu and returns the product names it shows.
 
  async openFromMenu(categoryTestId) {
    const sentAfterClick = new Set();
    const onRequest = (request) => {
      const isProductList =
        LIST_METHODS.includes(request.method()) && new URL(request.url()).pathname === '/products';
      if (isProductList) sentAfterClick.add(request);
    };
    this.page.on('request', onRequest);

    try {
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

  // page must show exactly what the api answered
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