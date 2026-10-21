const { test, expect } = require('../../../fixtures/test');
const { parsePrice } = require('../../../utils/price');

test.describe('Product page (positive)', () => {
  test.beforeEach(async ({ productPage, product }) => {
    await productPage.goto(product.id);
  });

  test('shows the name, price and description', async ({ productPage, product }) => {
    await expect(productPage.name).toHaveText(product.name);
    await expect(productPage.unitPrice).toHaveText(/\d+\.\d{2}/);
    await expect(productPage.description).toBeVisible();
  });

  test('shows the same price as the API', async ({ productPage, product }) => {
    await expect(productPage.unitPrice).toHaveText(/\d/);

    const shownPrice = parsePrice(await productPage.unitPrice.innerText());

    expect(shownPrice).toBeCloseTo(product.price, 2);
  });

  test('shows the brand of the product', async ({ productPage, product }) => {
    await expect(productPage.brand).toContainText(product.brand.name);
  });

  test('the quantity starts at 1', async ({ productPage }) => {
    await expect(productPage.quantity).toHaveValue('1');
  });

  test('the plus button raises the quantity to 2', async ({ productPage }) => {
    await productPage.increaseButton.click();

    await expect(productPage.quantity).toHaveValue('2');
  });

  test('the minus button lowers the quantity again', async ({ productPage }) => {
    await productPage.increaseButton.click();
    await productPage.increaseButton.click();
    await productPage.decreaseButton.click();

    await expect(productPage.quantity).toHaveValue('2');
  });

  test('adding to the cart shows a confirmation', async ({ productPage }) => {
    await productPage.addToCartButton.click();

    await expect(productPage.addedToast).toBeVisible();
  });
});