const { expect } = require('@playwright/test');
const { NavBar } = require('./components/NavBar');

class ProductPage {
  constructor(page) {
    this.page = page;
    this.nav = new NavBar(page);
    this.name = page.getByTestId('product-name').first();
    this.unitPrice = page.getByTestId('unit-price');
    this.description = page.getByTestId('product-description');
    this.brand = page.getByLabel('brand');
    this.quantity = page.getByTestId('quantity');
    this.increaseButton = page.getByTestId('increase-quantity');
    this.decreaseButton = page.getByTestId('decrease-quantity');
    this.addToCartButton = page.getByTestId('add-to-cart');
    this.addToFavoritesButton = page.getByTestId('add-to-favorites');
    this.addedToast = page.getByText(/Product added to shopping cart/i);
    this.favoritesError = page.getByText(/Unauthorized, can not add/i);
  }

  async goto(id) {
    await this.page.goto(`/product/${id}`);
  }

  // The number shown on the cart icon's badge (0 when there is none)
  async cartCount() {
    const text = await this.nav.cart.innerText();
    const match = text.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  // Adds the product and waits until the site confirms it: the toast message appears, or the cart
  // badge reaches the expected number (the toast disappears quickly, so it can be missed when slow)
  async addToCart(expectedCount = 1) {
    await this.addToCartButton.click();
    await expect(async () => {
      const toastVisible = await this.addedToast.isVisible();
      expect(toastVisible || (await this.cartCount()) >= expectedCount).toBe(true);
    }).toPass({ timeout: 30_000 });
  }
}

module.exports = { ProductPage };