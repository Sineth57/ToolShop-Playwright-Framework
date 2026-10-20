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

  // Returns the first product from the catalogue, for tests that need a real id
  async firstProduct() {
    const response = await this.list();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    return body.data[0];
  }
}

module.exports = { ProductsApi };