const fs = require('fs');
const base = require('@playwright/test');
const { HomePage } = require('../pages/HomePage');
const { LoginPage } = require('../pages/LoginPage');
const { RegisterPage } = require('../pages/RegisterPage');
const { ContactPage } = require('../pages/ContactPage');
const { ProductPage } = require('../pages/ProductPage');
const { CartPage } = require('../pages/CartPage');
const { CheckoutPage } = require('../pages/CheckoutPage');
const { AuthApi } = require('../api/AuthApi');
const { ProductsApi } = require('../api/ProductsApi');
const { buildUserPayload } = require('../utils/userFactory');
const { API_URL } = require('../utils/env');
const { USER_FILE } = require('../utils/paths');

const test = base.test.extend({
  // Page Objects
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  contactPage: async ({ page }, use) => {
    await use(new ContactPage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },

  // API clients (the built-in `request` points at the website, this one at the API)
  apiRequest: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({ baseURL: API_URL });
    await use(context);
    await context.dispose();
  },
  authApi: async ({ apiRequest }, use) => {
    await use(new AuthApi(apiRequest));
  },
  products: async ({ apiRequest }, use) => {
    await use(new ProductsApi(apiRequest));
  },

  // Test data: a brand-new user created through the API for this one test
  newUser: async ({ authApi }, use) => {
    const user = buildUserPayload();
    const response = await authApi.register(user);
    base.expect(response.status(), await response.text()).toBe(201);
    await use(user);
  },

  // The first product of the catalogue, read from the API
  product: async ({ products }, use) => {
    await use(await products.firstProduct());
  },

  // A cart that already holds one product (chosen through the API, added through the UI)
  cartWithProduct: async ({ productPage, products }, use) => {
    const [product] = await products.firstProducts(1);
    await productPage.goto(product.id);
    await productPage.addToCart();
    await use(product);
  },

  // The user the setup project logged in (credentials saved in .auth)
  savedUser: async ({}, use) => {
    await use(JSON.parse(fs.readFileSync(USER_FILE, 'utf8')));
  },
});

module.exports = { test, expect: base.expect };