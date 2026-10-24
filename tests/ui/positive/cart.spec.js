const { test, expect } = require('../../../fixtures/test');
const { parsePrice } = require('../../../utils/price');

test.describe('Cart (positive)', () => {
  test('TC170 - a product added from its page appears in the cart', async ({ cartWithProduct, cartPage }) => {
    await cartPage.open();

    await expect(cartPage.row(cartWithProduct.name)).toBeVisible();
    await expect(cartPage.quantityOf(cartWithProduct.name)).toHaveValue('1');
  });

  test('TC171 - the line total equals the unit price times the quantity', async ({ cartWithProduct, cartPage }) => {
    await cartPage.open();
    await cartPage.setQuantity(cartWithProduct.name, 3);

    await expect
      .poll(async () => parsePrice(await cartPage.lineTotalOf(cartWithProduct.name).innerText()))
      .toBeCloseTo(cartWithProduct.price * 3, 2);
  });

  test('TC172 - the cart total equals the line total of a single product', async ({ cartWithProduct, cartPage }) => {
    await cartPage.open();

    await expect
      .poll(async () => parsePrice(await cartPage.total.innerText()))
      .toBeCloseTo(cartWithProduct.price, 2);
  });

  test('TC173 - the cart total is the sum of two products', async ({ cartWithProduct, catalogue, productPage, cartPage }) => {
    const second = catalogue[1];
    await productPage.goto(second.id);
    await productPage.addToCart(2);

    await cartPage.open();

    await expect
      .poll(async () => parsePrice(await cartPage.total.innerText()))
      .toBeCloseTo(cartWithProduct.price + second.price, 2);
  });

  test('TC174 - removing the only product empties the cart', async ({ cartWithProduct, cartPage }) => {
    await cartPage.open();
    await cartPage.remove(cartWithProduct.name);

    await expect(cartPage.rows).toHaveCount(0);
  });

  test('TC175 - continue shopping returns to the catalogue', async ({ cartWithProduct, cartPage, homePage, page }) => {
    await cartPage.open();
    await cartPage.continueShopping.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(homePage.productNames.first()).toBeVisible();
  });

  test('TC176 - the cart keeps its content after reloading the page', async ({ cartWithProduct, cartPage, page }) => {
    await cartPage.open();
    await page.reload();

    await expect(cartPage.row(cartWithProduct.name)).toBeVisible();
  });
});