
const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const { CartApi } = require('../../../api/CartApi');
const { ProductsApi } = require('../../../api/ProductsApi');

test.use({ baseURL: API_URL });

const MISSING_ID = '00000000000000000000000000';
const INVALID_ID = 'invalid-cart-id';

test.describe('Carts API (negative)', () => {

  test('TC008 - GET a cart that does not exist returns 404', async ({ request }) => {
    const response = await new CartApi(request).get(MISSING_ID);

    expect(response.status()).toBe(404);
  });

  test('TC009 - adding a product to a cart that does not exist returns 404', async ({ request }) => {
    const product = await new ProductsApi(request).firstProduct();

    const response = await new CartApi(request).addItem(MISSING_ID, product.id);

    expect(response.status()).toBe(404);
  });

  test('TC010 - adding a product that does not exist is rejected', async ({ request }) => {
    const cartApi = new CartApi(request);
    const cartId = await cartApi.createCartId();

    const response = await cartApi.addItem(cartId, MISSING_ID);

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });


  test('TC011 - GET a cart with an invalid ID format is rejected', async ({ request }) => {
    const response = await new CartApi(request).get(INVALID_ID);

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('TC012 - GET a cart with an empty ID is rejected', async ({ request }) => {
    const response = await new CartApi(request).get('');

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('TC013 - adding a product with an invalid ID format is rejected', async ({ request }) => {
    const cartApi = new CartApi(request);
    const cartId = await cartApi.createCartId();

    const response = await cartApi.addItem(cartId, INVALID_ID);

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('TC014 - adding a product with an empty ID is rejected', async ({ request }) => {
    const cartApi = new CartApi(request);
    const cartId = await cartApi.createCartId();

    const response = await cartApi.addItem(cartId, '');

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('TC015 - adding a product with a null ID is rejected', async ({ request }) => {
    const cartApi = new CartApi(request);
    const cartId = await cartApi.createCartId();

    const response = await request.post(`/carts/${cartId}/items`, {
      data: {
        productId: null,
        quantity: 1,
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('TC016 - adding a product with a negative quantity is rejected', async ({ request }) => {
    const cartApi = new CartApi(request);
    const cartId = await cartApi.createCartId();
    const product = await new ProductsApi(request).firstProduct();

    const response = await request.post(`/carts/${cartId}/items`, {
      data: {
        productId: product.id,
        quantity: -1,
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('TC017 - adding a product with zero quantity is rejected', async ({ request }) => {
    const cartApi = new CartApi(request);
    const cartId = await cartApi.createCartId();
    const product = await new ProductsApi(request).firstProduct();

    const response = await request.post(`/carts/${cartId}/items`, {
      data: {
        productId: product.id,
        quantity: 0,
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('TC018 - adding a product without a quantity is rejected', async ({ request }) => {
    const cartApi = new CartApi(request);
    const cartId = await cartApi.createCartId();
    const product = await new ProductsApi(request).firstProduct();

    const response = await request.post(`/carts/${cartId}/items`, {
      data: {
        productId: product.id,
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('TC020 - adding a product with a string quantity is rejected', async ({ request }) => {
    const cartApi = new CartApi(request);
    const cartId = await cartApi.createCartId();
    const product = await new ProductsApi(request).firstProduct();

    const response = await request.post(`/carts/${cartId}/items`, {
      data: {
        productId: product.id,
        quantity: 'abc',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('TC021 - adding a product with a decimal quantity is rejected', async ({ request }) => {
    const cartApi = new CartApi(request);
    const cartId = await cartApi.createCartId();
    const product = await new ProductsApi(request).firstProduct();

    const response = await request.post(`/carts/${cartId}/items`, {
      data: {
        productId: product.id,
        quantity: 1.5,
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

});
