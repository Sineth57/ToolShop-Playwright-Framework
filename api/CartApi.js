const { expect } = require('@playwright/test');

class CartApi {
  constructor(request) {
    this.request = request;
  }

  create() {
    return this.request.post('/carts');
  }

  async createCartId() {
    const response = await this.create();
    const text = await response.text();
    expect(response.status(), `Create cart failed: ${text}`).toBe(201);
    return JSON.parse(text).id;
  }

  addItem(cartId, productId, quantity = 1) {
    return this.request.post(`/carts/${cartId}`, {
      data: { product_id: productId, quantity },
    });
  }

  get(cartId) {
    return this.request.get(`/carts/${cartId}`);
  }
}

module.exports = { CartApi };