const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const data = require('../../../test-data/related-products-data.json');

test.use({ baseURL: API_URL });

const KNOWN_ISSUE = 'Known application bug: GET /products/{id}/related answers HTTP 500 for an unknown product';

test.describe('GET /products/{id}/related (negative)', () => {
  for (const { name, id } of data.unknownIds) {
    test(`a product with ${name} as the id does not cause a server error`, async ({ request }) => {
      // The expectation stays correct (a 4xx); the test is flagged as soon as the bug is fixed
      test.fail(true, KNOWN_ISSUE);

      const response = await request.get(`/products/${encodeURIComponent(id)}/related`);

      await test.info().attach('answer', { body: `HTTP ${response.status()}`, contentType: 'text/plain' });
      expect(
        response.status(),
        'the API must answer an unknown product with a 4xx, not a server error',
      ).toBeLessThan(500);
    });
  }
});