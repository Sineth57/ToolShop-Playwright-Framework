
const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const data = require('../../../test-data/api-data.json');

test.use({ baseURL: API_URL });

test.describe('Brands and categories (negative)', () => {

  for (const id of data.unknownIds) {

    test(`GET /brands/${id} returns 404`, async ({ request }) => {
      const response = await request.get(`/brands/${id}`);

      expect(response.status()).toBe(404);
    });

    // Categories api has no GET get by id route
    test(`GET /categories/${id} returns 405`, async ({ request }) => {
      const response = await request.get(`/categories/${id}`);

      expect(response.status()).toBe(405);
    });
  }


  test('TC001 - GET /brands with an invalid ID format is rejected', async ({ request }) => {
    const response = await request.get('/brands/invalid-id');

    expect(response.status()).toBe(404);
  });

  test('TC002 - GET /brands with a non-numeric ID is rejected', async ({ request }) => {
    const response = await request.get('/brands/abc');

    expect(response.status()).toBe(404);
  });

  test('TC003 - GET /brands with an unknown ID returns an error response', async ({ request }) => {
    const response = await request.get('/brands/999999999');

    expect(response.status()).toBe(404);
  });

  test('TC004 - POST /brands without a request body is rejected', async ({ request }) => {
    const response = await request.post('/brands');

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('TC005 - POST /categories without a request body is rejected', async ({ request }) => {
    const response = await request.post('/categories');

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('TC006 - PUT /brands with an unknown ID is rejected', async ({ request }) => {
    const response = await request.put('/brands/999999999', {
      data: {
        name: 'Test Brand',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('TC007 - DELETE /brands with an unknown ID is rejected', async ({ request }) => {
    const response = await request.delete('/brands/999999999');

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

});
