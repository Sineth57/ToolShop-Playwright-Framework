const { test, expect } = require('../../../fixtures/test');
const { parsePrice } = require('../../../utils/price');

test.describe('Cart (positive)', () => {
  test('a product added from its page appears in the cart', async ({ cartWithProduct, cartPage }) => {
    await cartPage.open();

    await expect(cartPage.row(cartWithProduct.name)).toBeVisible();
    await expect(cartPage.quantityOf(cartWithProduct.name)).toHaveValue('1');
  });

  test('the line total equals the unit price times the quantity', async ({ cartWithProduct, cartPage }) => {
    await cartPage.open();
    await cartPage.setQuantity(cartWithProduct.name, 3);

    await expect
      .poll(async () => parsePrice(await cartPage.lineTotalOf(cartWithProduct.name).innerText()))
      .toBeCloseTo(cartWithProduct.price * 3, 2);
  });

  test('the cart total equals the line total of a single product', async ({ cartWithProduct, cartPage }) => {
    await cartPage.open();

    await expect
      .poll(async () => parsePrice(await cartPage.total.innerText()))
      .toBeCloseTo(cartWithProduct.price, 2);
  });

  test('the cart total is the sum of two products', async ({ cartWithProduct, products, productPage, cartPage }) => {
    const [, second] = await products.firstProducts(2);
    await productPage.goto(second.id);
    await productPage.addToCart(2);

    await cartPage.open();

    await expect
      .poll(async () => parsePrice(await cartPage.total.innerText()))
      .toBeCloseTo(cartWithProduct.price + second.price, 2);
  });

  test('removing the only product empties the cart', async ({ cartWithProduct, cartPage }) => {
    await cartPage.open();
    await cartPage.remove(cartWithProduct.name);

    await expect(cartPage.rows).toHaveCount(0);
  });

  test('continue shopping returns to the catalogue', async ({ cartWithProduct, cartPage, homePage, page }) => {
    await cartPage.open();
    await cartPage.continueShopping.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(homePage.productNames.first()).toBeVisible();
  });

  test('the cart keeps its content after reloading the page', async ({ cartWithProduct, cartPage, page }) => {
    await cartPage.open();
    await page.reload();

    await expect(cartPage.row(cartWithProduct.name)).toBeVisible();
  });
});