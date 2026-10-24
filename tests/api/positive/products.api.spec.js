const { test, expect } = require('@playwright/test');
const { API_URL } = require('../../../utils/env');
const { expectSchema } = require('../../../utils/schema');
const { timedGet } = require('../../../utils/timing');
const { ProductsApi } = require('../../../api/ProductsApi');
const productsSchema = require('../../../schemas/products.schema.json');
const productSchema = require('../../../schemas/product.schema.json');
const data = require('../../../test-data/api-data.json');

test.use({ baseURL: API_URL });

test.describe('GET /products (positive)', () => {
  test('TC081 - returns 200, JSON and a non-empty product list', async ({ request }) => {
    const response = await request.get('/products');

    // fail with a message if we reach the website instead of the api
    expect(response.url()).toBe(`${API_URL}/products`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('TC082 - response body matches the products schema', async ({ request }) => {
    const response = await request.get('/products');
    expect(response.status()).toBe(200);

    expectSchema(productsSchema, await response.json());
  });

  test('TC083 - responds within the allowed time', async ({ request }) => {
    const { response, duration } = await timedGet(request, '/products');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(duration).toBeLessThan(data.maxResponseMs);
  });

  test('TC084 - includes pagination metadata', async ({ request }) => {
    const response = await request.get('/products');
    const body = await response.json();

    for (const field of ['current_page', 'last_page', 'per_page', 'total']) {
      expect(typeof body[field], `${field} should be a number`).toBe('number');
    }
  });

  for (const pageNumber of data.pages) {
    test(`TC085 - returns page ${pageNumber} when requested`, async ({ request }) => {
      const products = new ProductsApi(request);
      const response = await products.list({ page: pageNumber });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.current_page).toBe(pageNumber);
      expect(body.data.length).toBeGreaterThan(0);
    });
  }

  test('TC086 - sorts products by price ascending', async ({ request }) => {
    const products = new ProductsApi(request);
    const response = await products.list({ sort: 'price,asc' });

    expect(response.status()).toBe(200);
    const prices = (await response.json()).data.map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('TC087 - sorts products by price descending', async ({ request }) => {
    const products = new ProductsApi(request);
    const response = await products.list({ sort: 'price,desc' });

    expect(response.status()).toBe(200);
    const prices = (await response.json()).data.map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  for (const { min, max } of data.priceRanges) {
    test(`TC088 - filters products priced between ${min} and ${max}`, async ({ request }) => {
      const products = new ProductsApi(request);
      const response = await products.list({ between: `price,${min},${max}` });

      expect(response.status()).toBe(200);
      const items = (await response.json()).data;
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.price).toBeGreaterThanOrEqual(min);
        expect(item.price).toBeLessThanOrEqual(max);
      }
    });
  }

  for (const term of data.searchTerms) {
    test(`TC089 - search for "${term}" returns matching products`, async ({ request }) => {
      const products = new ProductsApi(request);
      const response = await products.search(term);

      expect(response.status()).toBe(200);
      const items = (await response.json()).data;
      expect(items.length).toBeGreaterThan(0);
    });
  }

  test('TC090 - filters products by brand', async ({ request }) => {
    const products = new ProductsApi(request);
    const product = await products.firstProduct();
    const brandId = product.brand?.id;
    expect(brandId, 'first product has no brand id').toBeTruthy();

    const response = await products.list({ by_brand: brandId });
    expect(response.status()).toBe(200);
    const items = (await response.json()).data;
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.brand?.id).toBe(brandId);
    }
  });

  test('TC091 - filters products by category', async ({ request }) => {
    const products = new ProductsApi(request);
    const product = await products.firstProduct();
    const categoryId = product.category?.id;
    expect(categoryId, 'first product has no category id').toBeTruthy();

    const response = await products.list({ by_category: categoryId });
    expect(response.status()).toBe(200);
    const items = (await response.json()).data;
    expect(items.length).toBeGreaterThan(0);
  });
});

test.describe('GET /products/{id} (positive)', () => {
  test('TC092 - returns the requested product and matches the product schema', async ({ request }) => {
    const products = new ProductsApi(request);
    const product = await products.firstProduct();

    const response = await products.getById(product.id);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expectSchema(productSchema, body);
    expect(body.id).toBe(product.id);
    expect(body.name).toBe(product.name);
    
  });
});