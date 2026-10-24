const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const { expectSchema } = require('../../../utils/schema');
const { timedGet } = require('../../../utils/timing');
const brandsSchema = require('../../../schemas/brands.schema.json');
const categoriesSchema = require('../../../schemas/categories.schema.json');
const data = require('../../../test-data/api-data.json');

test.use({ baseURL: API_URL });

test.describe('Brands API (positive)', () => {
  test('TC069 - GET /brands returns a non-empty list matching the schema', async ({ request }) => {
    const response = await request.get('/brands');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.length).toBeGreaterThan(0);
    expectSchema(brandsSchema, body);
  });

  test('TC070 - GET /brands/{id} returns the requested brand', async ({ request }) => {
    const brands = await (await request.get('/brands')).json();
    const brand = brands[0];

    const response = await request.get(`/brands/${brand.id}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(brand.id);
    expect(body.name).toBe(brand.name);
  });

  test('TC071 - GET /brands responds within the allowed time', async ({ request }) => {
    const { response, duration } = await timedGet(request, '/brands');

    expect(response.status()).toBe(200);
    expect(duration).toBeLessThan(data.maxResponseMs);
  });
});

test.describe('Categories API (positive)', () => {
  test('TC072 - GET /categories returns a non-empty list matching the schema', async ({ request }) => {
    const response = await request.get('/categories');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.length).toBeGreaterThan(0);
    expectSchema(categoriesSchema, body);
  });

  test('TC073 - GET /categories/tree returns a non-empty list', async ({ request }) => {
    const response = await request.get('/categories/tree');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('TC074 - GET /categories/tree nodes have an id and a name', async ({ request }) => {
    const response = await request.get('/categories/tree');

    expect(response.status()).toBe(200);
    expectSchema(categoriesSchema, await response.json());
  });

  test('TC075 - GET /categories responds within the allowed time', async ({ request }) => {
    const { response, duration } = await timedGet(request, '/categories');

    expect(response.status()).toBe(200);
    expect(duration).toBeLessThan(data.maxResponseMs);
  });
});