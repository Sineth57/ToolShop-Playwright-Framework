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

    // The categories API has no GET-by-id route, so it answers 405 Method Not Allowed
    test(`GET /categories/${id} is not allowed and returns 405`, async ({ request }) => {
      const response = await request.get(`/categories/${id}`);

      expect(response.status()).toBe(405);
    });
  }
});