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
  // first two catalogue products read from the api once per worker and shared by its tests
  catalogue: [
    async ({ playwright }, use) => {
      const context = await playwright.request.newContext({ baseURL: API_URL });
      const products = await new ProductsApi(context).firstProducts(2);
      await use(products);
      await context.dispose();
    },
    { scope: 'worker', timeout: 60_000 },
  ],

  // page objects
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

  // API clients
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

  // test data
  newUser: async ({ authApi }, use) => {
    const user = buildUserPayload();
    const response = await authApi.register(user);
    base.expect(response.status(), await response.text()).toBe(201);
    await use(user);
  },

  // first product of the catalogue
  product: async ({ catalogue }, use) => {
    await use(catalogue[0]);
  },

  // cart that already holds one product 
  cartWithProduct: async ({ productPage, catalogue }, use) => {
    const [product] = catalogue;
    await productPage.goto(product.id);
    await productPage.addToCart();
    await use(product);
  },

  // user the setup project logged in (credentials saved in auth)
  savedUser: async ({}, use) => {
    await use(JSON.parse(fs.readFileSync(USER_FILE, 'utf8')));
  },
});

module.exports = { test, expect: base.expect };