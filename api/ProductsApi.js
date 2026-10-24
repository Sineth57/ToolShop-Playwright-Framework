const { expect } = require('@playwright/test');

class ProductsApi {
  constructor(request) {
    this.request = request;
  }

  list(params = {}) {
    return this.request.get('/products', { params, timeout: 20_000 });
  }

  search(q) {
    return this.request.get('/products/search', { params: { q } });
  }

  getById(id) {
    return this.request.get(`/products/${id}`);
  }

  // getting the first count products of the catalogue
  async firstProducts(count = 1) {
    let products = [];
    await expect(async () => {
      const response = await this.list();
      expect(response.status(), 'GET /products did not return 200').toBe(200);
      const body = await response.json();
      expect(body.data.length).toBeGreaterThanOrEqual(count);
      products = body.data.slice(0, count);
    }).toPass({ intervals: [1_000, 2_000, 4_000], timeout: 40_000 });
    return products;
  }

  async firstProduct() {
    const [product] = await this.firstProducts(1);
    return product;
  }
}

module.exports = { ProductsApi };