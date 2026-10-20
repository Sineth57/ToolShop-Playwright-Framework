const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const { CartApi } = require('../../../api/CartApi');
const { ProductsApi } = require('../../../api/ProductsApi');

test.use({ baseURL: API_URL });

const MISSING_ID = '00000000000000000000000000';

test.describe('Carts API (negative)', () => {
  test('GET a cart that does not exist returns 404', async ({ request }) => {
    const response = await new CartApi(request).get(MISSING_ID);

    expect(response.status()).toBe(404);
  });

  test('adding a product to a cart that does not exist returns 404', async ({ request }) => {
    const product = await new ProductsApi(request).firstProduct();

    const response = await new CartApi(request).addItem(MISSING_ID, product.id);
    expect(response.status()).toBe(404);
  });

  test('adding a product that does not exist is rejected', async ({ request }) => {
    const cartApi = new CartApi(request);
    const cartId = await cartApi.createCartId();

    const response = await cartApi.addItem(cartId, MISSING_ID);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});