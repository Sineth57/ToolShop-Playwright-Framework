const { expect } = require('@playwright/test');
const { API_ORIGIN } = require('./networkWatch');

// remembers the id of the cart the page creates (the page creates it when the first product is added)
function watchCart(page) {
  const cart = { id: null };
  page.on('response', async (response) => {
    const url = new URL(response.url());
    const isCartCreation =
      url.origin === API_ORIGIN && url.pathname === '/carts' && response.request().method() === 'POST';
    if (isCartCreation && response.ok()) {
      const body = await response.json().catch(() => null);
      if (body && body.id) cart.id = body.id;
    }
  });
  return cart;
}

const productIdOf = (item) => item.product_id ?? item.product?.id;

// lines of the cart, read from the api - empty list when the page never created a cart
async function cartItems(apiRequest, cart) {
  if (!cart.id) return [];
  const response = await apiRequest.get(`/carts/${cart.id}`);
  expect(response.status(), 'could not read the cart').toBe(200);
  return (await response.json()).cart_items ?? [];
}

// how many of a product the cart holds 
async function quantityInCart(apiRequest, cart, productId) {
  const item = (await cartItems(apiRequest, cart)).find((line) => productIdOf(line) === productId);
  return item ? item.quantity : null;
}

// product may be missing from the cart (the add was refused), but if it is there the quantity must be a whole number from 1 
// to 99
function expectValidQuantity(quantity) {
  if (quantity === null) return;
  const valid = Number.isInteger(quantity) && quantity >= 1 && quantity <= 99;
  expect(valid, `the cart holds an invalid quantity: ${quantity}`).toBe(true);
}

module.exports = { watchCart, cartItems, quantityInCart, expectValidQuantity, productIdOf };