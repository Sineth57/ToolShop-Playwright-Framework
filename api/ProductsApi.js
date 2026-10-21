const { expect } = require('@playwright/test');

class ProductsApi {
  constructor(request) {
    this.request = request;
  }

  list(params = {}) {
    return this.request.get('/products', { params });
  }

  search(q) {
    return this.request.get('/products/search', { params: { q } });
  }

  getById(id) {
    return this.request.get(`/products/${id}`);
  }

  // Returns the first `count` products of the catalogue, for tests that need real ids
  async firstProducts(count = 1) {
    const response = await this.list();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeGreaterThanOrEqual(count);
    return body.data.slice(0, count);
  }

  async firstProduct() {
    const [product] = await this.firstProducts(1);
    return product;
  }
}

module.exports = { ProductsApi };