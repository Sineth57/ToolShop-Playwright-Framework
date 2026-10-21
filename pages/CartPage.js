const { NavBar } = require('./components/NavBar');

class CartPage {
  constructor(page) {
    this.page = page;
    this.nav = new NavBar(page);
    this.rows = page.locator('tbody tr');
    this.total = page.getByRole('strong').locator('xpath=ancestor::*[contains(., "$")][1]');
    this.continueShopping = page.getByTestId('continue-shopping');
    this.proceedButton = page.getByTestId('proceed-1');
  }

  async goto() {
    await this.page.goto('/checkout');
    await this.page.waitForURL(/checkout/);
  }

  async open() {
    await this.nav.cart.click();
    await this.page.waitForURL(/checkout/);
  }

  // table row of one product found by the exact text of its name cell
  row(name) {
    return this.rows.filter({ has: this.page.getByRole('cell', { name, exact: true }) });
  }

  quantityOf(name) {
    return this.row(name).getByTestId('product-quantity');
  }

  unitPriceOf(name) {
    return this.row(name).locator('td').nth(2);
  }

  lineTotalOf(name) {
    return this.row(name).locator('td').nth(3);
  }

  removeButtonOf(name) {
    return this.row(name).locator('td').last().locator('a, button');
  }

  async setQuantity(name, quantity) {
    const input = this.quantityOf(name);
    await input.fill(String(quantity));
    await input.press('Tab');
  }

  async remove(name) {
    await this.removeButtonOf(name).click();
  }
}

module.exports = { CartPage };