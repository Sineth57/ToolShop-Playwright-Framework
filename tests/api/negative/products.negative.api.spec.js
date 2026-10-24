const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const { ProductsApi } = require('../../../api/ProductsApi');
const data = require('../../../test-data/api-data.json');

test.use({ baseURL: API_URL });

// fake id = if protection missing no real product could be changed
const BOGUS_ID = '00000000000000000000000000';

test.describe('GET /products/{id} (negative)', () => {
  for (const id of data.unknownIds) {
    test(`TC038 - returns 404 for the unknown product id "${id}"`, async ({ request }) => {
      const response = await new ProductsApi(request).getById(id);

      expect(response.status()).toBe(404);
    });
  }

  test('TC039 - search with no matches returns an empty list', async ({ request }) => {
    const response = await new ProductsApi(request).search('zzzzqqqqxxxx');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(0);
  });

  test('TC040 - an unknown endpoint returns 404', async ({ request }) => {
    const response = await request.get('/this-endpoint-does-not-exist');

    expect(response.status()).toBe(404);
  });
});

test.describe('Product write endpoints (negative)', () => {
  test('TC041 - POST /products with an incomplete body is rejected with 422', async ({ request }) => {
    const response = await request.post('/products', { data: { name: 'Incomplete product' } });

    expect(response.status()).toBe(422);
  });

  test('TC042 - PUT /products/{id} for an unknown product returns 404', async ({ request }) => {
    const response = await request.put(`/products/${BOGUS_ID}`, { data: { name: 'Nope' } });

    expect(response.status()).toBe(404);
  });

  test('TC043 - DELETE /products/{id} without a token is rejected with 401', async ({ request }) => {
    const response = await request.delete(`/products/${BOGUS_ID}`);

    expect(response.status()).toBe(401);
  });
});