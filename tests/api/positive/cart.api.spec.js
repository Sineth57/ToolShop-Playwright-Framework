const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const { CartApi } = require('../../../api/CartApi');
const { ProductsApi } = require('../../../api/ProductsApi');

test.use({ baseURL: API_URL });

test.describe('Carts API (positive)', () => {
  test('creates an empty cart', async ({ request }) => {
    const cartApi = new CartApi(request);

    const response = await cartApi.create();
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.id).toBeTruthy();
  });

  test('adds a product to a cart', async ({ request }) => {
    const cartApi = new CartApi(request);
    const product = await new ProductsApi(request).firstProduct();
    const cartId = await cartApi.createCartId();

    const response = await cartApi.addItem(cartId, product.id);
    expect(response.status()).toBe(200);
  });

  test('lists the added product in the cart', async ({ request }) => {
    const cartApi = new CartApi(request);
    const product = await new ProductsApi(request).firstProduct();
    const cartId = await cartApi.createCartId();
    await cartApi.addItem(cartId, product.id);

    const response = await cartApi.get(cartId);
    expect(response.status()).toBe(200);
    const body = await response.json();
    const ids = body.cart_items.map((item) => item.product_id ?? item.product?.id);
    expect(ids).toContain(product.id);
  });

  test('stores the requested quantity', async ({ request }) => {
    const cartApi = new CartApi(request);
    const product = await new ProductsApi(request).firstProduct();
    const cartId = await cartApi.createCartId();
    await cartApi.addItem(cartId, product.id, 2);

    const body = await (await cartApi.get(cartId)).json();
    const item = body.cart_items.find((i) => (i.product_id ?? i.product?.id) === product.id);
    expect(item, 'added product not found in cart').toBeTruthy();
    expect(item.quantity).toBe(2);
  });
});