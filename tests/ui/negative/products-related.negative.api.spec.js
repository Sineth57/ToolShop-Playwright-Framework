const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const data = require('../../../test-data/related-products-data.json');

test.use({ baseURL: API_URL });

test.describe('GET /products/{id}/related (negative)', () => {
  for (const { name, id, knownIssue } of data.unknownIds) {
    test(`a product with ${name} as the id does not cause a server error`, async ({ request }) => {
      // ids with a known defect keep the correct expectation and are flagged when fixed
      test.fail(Boolean(knownIssue), knownIssue);

      const response = await request.get(`/products/${encodeURIComponent(id)}/related`);

      await test.info().attach('answer', { body: `HTTP ${response.status()}`, contentType: 'text/plain' });
      expect(
        response.status(),
        'the API must answer an unknown product with a 4xx, not a server error',
      ).toBeLessThan(500);
    });
  }
});