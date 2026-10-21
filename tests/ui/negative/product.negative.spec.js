const { test, expect } = require('../../../fixtures/test');

test.describe('Product page (negative)', () => {
  test('the minus button does not go below 1', async ({ productPage, product }) => {
    await productPage.goto(product.id);
    await productPage.decreaseButton.click();

    await expect(productPage.quantity).toHaveValue('1');
  });

  test('a guest cannot add a product to favorites', async ({ productPage, product }) => {
    await productPage.goto(product.id);
    await productPage.addToFavoritesButton.click();

    await expect(productPage.favoritesError).toBeVisible();
  });

  test('an unknown product id returns 404 and shows no product', async ({ productPage, page }) => {
    const unknownId = '00000000000000000000000000';

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/products/${unknownId}`)),
      productPage.goto(unknownId),
    ]);

    expect(response.status()).toBe(404);
    await expect(productPage.addToCartButton).toBeHidden();
  });
});