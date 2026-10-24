const { test, expect } = require('../../../fixtures/test');
const { expectErrorMessage, watchDialogs } = require('../../../utils/formMessages');
const { trackApi, watchPageErrors, mockApi, CORS_HEADERS } = require('../../../utils/networkWatch');
const { watchCart, cartItems, quantityInCart, expectValidQuantity, productIdOf } = require('../../../utils/cartWatch');
const data = require('../../../test-data/product-negative-data.json');

// one product and the request that adds a product to a cart
const PRODUCT_DETAIL = /^\/products\/(?!search$)[^/]+$/;
const CART_ADD = /^\/carts\/[^/]+$/;

function pathOf(response) {
  try {
    return decodeURIComponent(new URL(response.url()).pathname);
  } catch {
    return '';
  }
}

// opens a product address and returns the web server's answer 
async function openProductAddress(page, id) {
  const apiAnswer = (suffix) =>
    page
      .waitForResponse((r) => pathOf(r) === `/products/${id}${suffix}`, { timeout: 10_000 })
      .catch(() => null);
  const detail = apiAnswer('');
  const related = apiAnswer('/related');

  const response = await page.goto(`/product/${encodeURIComponent(id)}`);
  return { response, detail: await detail, related: await related };
}

async function clickAddToCart(productPage, page) {
  const answer = page
    .waitForResponse((r) => r.request().method() === 'POST' && CART_ADD.test(new URL(r.url()).pathname), {
      timeout: 5_000,
    })
    .catch(() => null);
  const clicked = await productPage.addToCartButton.click({ timeout: 5_000 }).then(
    () => true,
    () => false,
  );
  return { clicked, response: await answer };
}

// records what the page did and showed after an attempt, in the report and the console
async function recordAttempt(label, productPage, attempt) {
  const alerts = await productPage.alerts.allInnerTexts();
  let sent = 'the page sent no request';
  if (!attempt.clicked) sent = 'the Add to cart button could not be clicked (disabled?)';
  else if (attempt.response) sent = `HTTP ${attempt.response.status()} for ${attempt.response.request().postData()}`;
  const shown = alerts.map((text) => text.trim().replace(/\s+/g, ' ')).join(' | ') || 'none';

  await test.info().attach(`attempt: ${label}`, {
    body: `${sent}\nmessages on the page: ${shown}`,
    contentType: 'text/plain',
  });
  console.log(`[message] ${label}: ${sent} / messages on the page: ${shown}`);
}

async function attachPageErrors(errors) {
  await test.info().attach('uncaught page errors', {
    body: errors.join('\n') || 'none',
    contentType: 'text/plain',
  });
}

async function letPageReact(page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function expectProductMissingButSiteUsable(productPage, page) {
  await expect(productPage.nav.home).toBeVisible();
  await expect(productPage.addToCartButton).toBeHidden();
  await productPage.nav.contact.click();
  await expect(page).toHaveURL(/contact/);
}

test.describe('Product page (negative)', () => {
  test.describe('quantity buttons', () => {
    test('TC136 - the minus button does not go below 1', async ({ productPage, product }) => {
      await productPage.goto(product.id);
      await productPage.decreaseButton.click();
      await expect(productPage.quantity).toHaveValue('1');
    });

    test('TC137 - the plus button stops at the maximum quantity of 99', async ({ productPage, product }) => {
      await productPage.goto(product.id);
      await expect(productPage.name).toBeVisible();
      await productPage.quantity.fill('98');

      for (let click = 0; click < 4; click += 1) {
        await productPage.increaseButton.click();
      }

      await expect(productPage.quantity).toHaveValue('99');
    });
  });

  test.describe('quantity entered by hand', () => {
    for (const { name, value, typed } of data.invalidQuantities) {
      test(`TC138 - adding with ${name} as the quantity never puts an invalid quantity in the cart`, async ({
        productPage, product, page, apiRequest,
      }) => {
        const tracker = trackApi(page);
        const cart = watchCart(page);
        await productPage.goto(product.id);
        await expect(productPage.name).toBeVisible();

        if (typed) {
          await productPage.quantity.clear();
          await productPage.quantity.pressSequentially(value);
        } else {
          await productPage.quantity.fill(value);
        }

        const attempt = await clickAddToCart(productPage, page);
        await recordAttempt(`quantity ${name}`, productPage, attempt);

        expectValidQuantity(await quantityInCart(apiRequest, cart, product.id));
        expect(tracker.serverErrors, 'the API answered with a server error').toEqual([]);
      });
    }
  });

  test.describe('cart limits and rapid clicks', () => {
    test('TC139 - adding more of a product that is already at the maximum does not exceed 99', async ({
      productPage, product, page, apiRequest,
    }) => {
    
      test.fail(true, 'Known issue (to be confirmed): the cart accepts more than 99 of one product when adding to a line that already holds 99');

      const cart = watchCart(page);
      await productPage.goto(product.id);
      await expect(productPage.name).toBeVisible();

      await productPage.quantity.fill('99');
      const first = await clickAddToCart(productPage, page);
      expect(first.response, 'the first add was not sent').not.toBeNull();
      expect(first.response.ok(), `the first add answered HTTP ${first.response.status()}`).toBe(true);

      await productPage.quantity.fill('1');
      const second = await clickAddToCart(productPage, page);
      await recordAttempt('adding 1 more to a cart that holds 99', productPage, second);

      expectValidQuantity(await quantityInCart(apiRequest, cart, product.id));
    });

    test('TC140 - clicking Add to cart twice quickly does not create duplicate lines', async ({
      productPage, product, page, apiRequest,
    }) => {
      const cart = watchCart(page);
      await productPage.goto(product.id);
      await expect(productPage.name).toBeVisible();

      await productPage.addToCartButton.dblclick();

      await expect
        .poll(() => quantityInCart(apiRequest, cart, product.id), { timeout: 20_000 })
        .not.toBeNull();
      const lines = (await cartItems(apiRequest, cart)).filter((line) => productIdOf(line) === product.id);
      expect(lines, 'the product appears on more than one cart line').toHaveLength(1);
      expect(lines[0].quantity).toBeLessThanOrEqual(2);
    });
  });

  test.describe('favorites', () => {
    test('TC141 - a guest cannot add a product to favorites', async ({ productPage, product }) => {
      await productPage.goto(product.id);
      await productPage.addToFavoritesButton.click();
      await expect(productPage.favoritesError).toBeVisible();
    });

    test('TC143 - the favorites message for a guest is shown without a server error', async ({
      productPage, product, page,
    }) => {
      const tracker = trackApi(page);
      await productPage.goto(product.id);
      await expect(productPage.name).toBeVisible();

      await productPage.addToFavoritesButton.click();

      await expectErrorMessage(productPage.favoritesError, 'product: favorites as a guest');
      await expect(productPage.name).toBeVisible();
      expect(tracker.serverErrors, 'the API answered with a server error').toEqual([]);
    });
  });

  test.describe('unknown product addresses', () => {
    test('TC144 - an unknown product id returns 404 and shows no product', async ({ productPage, page }) => {
      const unknownId = '00000000000000000000000000';

      const [response] = await Promise.all([
        page.waitForResponse((r) => pathOf(r) === `/products/${unknownId}`),
        productPage.goto(unknownId),
      ]);

      expect(response.status()).toBe(404);
      await expect(productPage.addToCartButton).toBeHidden();
    });

    for (const { name, id, repeat } of data.unknownProductIds) {
      test(`TC145 - opening a product with ${name} as the id is handled safely`, async ({ productPage, page }) => {
        const dialogs = watchDialogs(page);
        const tracker = trackApi(page);
        const value = repeat ? id.repeat(repeat) : id;

        const { response, detail, related } = await openProductAddress(page, value);

        const outcome = [
          `web server: HTTP ${response.status()}`,
          `product request: ${detail ? `HTTP ${detail.status()}` : 'not sent'}`,
          `related products request: ${related ? `HTTP ${related.status()}` : 'not sent'}`,
        ].join(' / ');
        await test.info().attach(`outcome: ${name}`, { body: outcome, contentType: 'text/plain' });
        console.log(`[message] address with ${name}: ${outcome}`);

        expect(response.status(), 'the web server itself failed').toBeLessThan(500);
        
        if (response.status() === 200) {
          await expect(productPage.nav.home).toBeVisible();
        }
        await expect(productPage.addToCartButton).toBeHidden();
        if (detail) expect([400, 404, 422]).toContain(detail.status());

        const unexpected = tracker.serverErrors.filter((line) => !line.endsWith('/related'));
        expect(unexpected, 'the API answered with a server error').toEqual([]);
        expect(dialogs, 'a script in the address must not open a dialog').toEqual([]);
      });
    }
  });

  test.describe('problems with the product API (simulated)', () => {
    test('TC146 - a server error (HTTP 500) shows no product and leaves the site usable', async ({
      productPage, product, page,
    }) => {
      const pageErrors = watchPageErrors(page);
      await mockApi(page, PRODUCT_DETAIL, (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: 'Server Error' }),
        }),
      );

      await productPage.goto(product.id);

      await expectProductMissingButSiteUsable(productPage, page);
      await attachPageErrors(pageErrors);
    });

    test('TC147 - a failed network connection shows no product and leaves the site usable', async ({
      productPage, product, page,
    }) => {
      const pageErrors = watchPageErrors(page);
      await mockApi(page, PRODUCT_DETAIL, (route) => route.abort('failed'));

      await productPage.goto(product.id);

      await expectProductMissingButSiteUsable(productPage, page);
      await attachPageErrors(pageErrors);
    });

    test('TC148 - an answer that is not valid JSON shows no product and leaves the site usable', async ({
      productPage, product, page,
    }) => {
      const pageErrors = watchPageErrors(page);
      await mockApi(page, PRODUCT_DETAIL, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: CORS_HEADERS,
          body: 'this is not json',
        }),
      );

      await productPage.goto(product.id);

      await expectProductMissingButSiteUsable(productPage, page);
      await attachPageErrors(pageErrors);
    });

    test('TC149 - a product with missing details leaves the site usable', async ({ productPage, product, page }) => {
      const pageErrors = watchPageErrors(page);
      await mockApi(page, PRODUCT_DETAIL, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: CORS_HEADERS,
          body: JSON.stringify({ id: product.id, name: product.name }),
        }),
      );

      await productPage.goto(product.id);

      await expect(productPage.nav.home).toBeVisible();
      await productPage.nav.contact.click();
      await expect(page).toHaveURL(/contact/);
      await attachPageErrors(pageErrors);
    });

    for (const status of data.failedAddStatuses) {
      test(`TC150 - a failed add to cart (HTTP ${status}) does not show the success message`, async ({
        productPage, product, page,
      }) => {
        await mockApi(page, CART_ADD, (route) =>
          route.request().method() === 'POST'
            ? route.fulfill({
                status,
                contentType: 'application/json',
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Simulated failure' }),
              })
            : route.continue(),
        );
        await productPage.goto(product.id);
        await expect(productPage.name).toBeVisible();
        const countBefore = await productPage.cartCount();

        const attempt = await clickAddToCart(productPage, page);
        expect(attempt.response, 'the add request was not sent').not.toBeNull();
        expect(attempt.response.status()).toBe(status);
        await letPageReact(page);
        await recordAttempt(`failed add (HTTP ${status})`, productPage, attempt);

        await expect(productPage.addedToast).toBeHidden();
        expect(await productPage.cartCount(), 'the cart badge changed although the add failed').toBe(countBefore);
      });
    }
  });
});