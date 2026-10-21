// Walks the shop flow and prints every data-test locator on each page.
// Usage:  node scripts/audit-locators.js --confirm --headed
//   --confirm  also sends one contact message and places one order (with a fresh test user)
//   --headed   shows the browser while it runs
const fs = require('fs');
const { chromium, request, selectors } = require('@playwright/test');
require('dotenv').config({ quiet: true });
const { AuthApi } = require('../api/AuthApi');
const { LoginPage } = require('../pages/LoginPage');
const { buildUserPayload } = require('../utils/userFactory');
const { API_URL } = require('../utils/env');

// The site marks elements with data-test, so getByTestId must look for that attribute
selectors.setTestIdAttribute('data-test');

const BASE_URL = process.env.BASE_URL || 'https://practicesoftwaretesting.com';
const CONFIRM = process.argv.includes('--confirm');
const HEADED = process.argv.includes('--headed');
const OUTPUT_FILE = 'locator-audit.txt';
const lines = [];

function log(text = '') {
  console.log(text);
  lines.push(text);
}

// Opens a path and waits for the Angular app to settle
async function open(page, path) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

async function dump(page, title) {
  await page.waitForLoadState('networkidle');
  const info = await page.evaluate(() => {
    const clean = (s) => (s || '').trim().replace(/\s+/g, ' ');
    const tagged = new Set();
    for (const e of document.querySelectorAll('[data-test]')) {
      const tag = e.tagName.toLowerCase();
      const isField = ['input', 'select', 'textarea'].includes(tag);
      const value = isField && e.value ? ` value="${e.value.slice(0, 40)}"` : '';
      const text = !isField ? ` text="${clean(e.textContent).slice(0, 50)}"` : '';
      tagged.add(`${tag}[${e.getAttribute('data-test')}]${value}${text}`);
    }
    const untagged = new Set();
    for (const e of document.querySelectorAll('button, a.btn, .btn')) {
      if (e.hasAttribute('data-test')) continue;
      untagged.add(`${e.tagName.toLowerCase()} class="${e.className}" text="${clean(e.textContent).slice(0, 30)}"`);
    }
    return { tagged: [...tagged], untagged: [...untagged].slice(0, 20) };
  });

  log(`\n=== ${title} | ${page.url()} ===`);
  log('data-test elements:');
  info.tagged.forEach((t) => log(`  ${t}`));
  log('buttons/links WITHOUT data-test:');
  info.untagged.forEach((t) => log(`  ${t}`));
}

// Runs steps in order and stops the group at the first failure, printing why
async function runGroup(name, steps) {
  log(`\n##### ${name} #####`);
  for (const [title, action] of steps) {
    try {
      await action();
    } catch (error) {
      log(`\n!!! STOPPED at "${title}": ${error.message.split('\n')[0]}`);
      return;
    }
  }
}

(async () => {
  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  log(`Base URL: ${BASE_URL} | confirm mode: ${CONFIRM}`);

  const submit = () => page.locator('form button[type="submit"], form input[type="submit"]').first();

  // A fresh user, created through the API and logged in through the UI
  await runGroup('LOGIN WITH A FRESH USER', [
    ['register and log in', async () => {
      const api = await request.newContext({ baseURL: API_URL });
      const user = buildUserPayload();
      const response = await new AuthApi(api).register(user);
      await api.dispose();
      if (response.status() !== 201) throw new Error(`register returned ${response.status()}`);

      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await loginPage.nav.signIn.waitFor({ state: 'hidden' });
      await dump(page, 'Home page after login');
    }],
  ]);

  const contactSteps = [
    ['contact page', async () => {
      await open(page, '/contact');
      await dump(page, 'Contact page');
    }],
    ['empty contact submit', async () => {
      await submit().click();
      await dump(page, 'Contact page after submitting an empty form');
    }],
  ];
  if (CONFIRM) {
    contactSteps.push(['valid contact submit', async () => {
      await open(page, '/contact');
      await page.getByTestId('first-name').fill('Test');
      await page.getByTestId('last-name').fill('User');
      await page.getByTestId('email').fill(`audit.${Date.now()}@example.com`);
      await page.getByTestId('subject').selectOption({ index: 1 });
      await page.getByTestId('message').fill('This is an automated check of the contact form, please ignore this message.');
      await submit().click();
      await dump(page, 'Contact page after a valid submit');
    }]);
  }

  const shopSteps = [
    ['open a product', async () => {
      await open(page, '/');
      await page.getByTestId('product-name').first().click();
      await page.waitForURL(/product/);
      await dump(page, 'Product page');
    }],
    ['add to cart', async () => {
      await page.getByRole('button', { name: /add to cart/i }).click();
      await dump(page, 'Product page after Add to cart');
    }],
    ['open the cart', async () => {
      await page.locator('a[href*="checkout"]').first().click();
      await page.waitForURL(/checkout/);
      await dump(page, 'Cart (checkout step 1)');
    }],
    ['proceed from cart', async () => {
      await page.getByRole('button', { name: /proceed to checkout/i }).click();
      await dump(page, 'Checkout step 2');
    }],
    ['proceed to billing address', async () => {
      await page.getByRole('button', { name: /proceed to checkout/i }).click();
      await dump(page, 'Billing address step');
    }],
    ['proceed to payment', async () => {
      await page.getByRole('button', { name: /proceed to checkout/i }).click();
      await dump(page, 'Payment step');
    }],
    ['choose a payment method', async () => {
      const select = page.locator('select').first();
      const values = await select.locator('option').evaluateAll((o) => o.map((x) => x.value));
      log(`\nPayment select options: ${JSON.stringify(values)}`);
      await select.selectOption({ index: 1 });
      await dump(page, 'Payment step with a method selected');
    }],
  ];
  if (CONFIRM) {
    shopSteps.push(['confirm the order', async () => {
      await page.locator('select').first().selectOption('cash-on-delivery');
      await page.getByRole('button', { name: /confirm/i }).click();
      await dump(page, 'After confirming the order');
    }]);
  }

  await runGroup('CONTACT', contactSteps);
  await runGroup('SHOP FLOW', shopSteps);

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'));
  log(`\nSaved to ${OUTPUT_FILE}`);
  await browser.close();
})();