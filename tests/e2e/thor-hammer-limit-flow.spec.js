const { test, expect } = require('../../fixtures/test');
const { watchCart, quantityInCart } = require('../../utils/cartWatch');
const { parsePrice } = require('../../utils/price');
const { mark, reportOrderRequests } = require('../../utils/orderReport');
const data = require('../../test-data/ui-data.json');
const { purchaseLimit } = require('../../test-data/e2e-data.json');

const PRODUCT = purchaseLimit.product;
const LIMIT = purchaseLimit.maxPerCustomer;
const RULE = new RegExp(purchaseLimit.ruleText, 'i');

const CART_ADD = /^\/carts\/[^/]+$/; // the request that adds a product to a cart
const CART_CHANGE = /^\/carts\/[^/]+/; // any request that changes a cart

async function findProduct(products) {
  const response = await products.search(PRODUCT);
  expect(response.status(), 'the product search failed').toBe(200);
  const { data: found } = await response.json();
  const product = found.find((item) => item.name.trim() === PRODUCT);
  expect(product, `"${PRODUCT}" was not found in the catalogue`).toBeTruthy();
  return product;
}

// Clicks "Add to cart" and returns what happened whether the click was possible and the api's answer to the add request 
async function clickAddToCart(productPage, page) {
  const answer = page
    .waitForResponse((r) => r.request().method() === 'POST' && CART_ADD.test(new URL(r.url()).pathname), {
      timeout: 10_000,
    })
    .catch(() => null);
  const clicked = await productPage.addToCartButton.click({ timeout: 5_000 }).then(
    () => true,
    () => false,
  );
  return { clicked, response: await answer };
}

// records what the page did and showed after an attempt and the console
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

async function expectWithinLimit({ apiRequest, cart, cartPage, page, product, label }) {
  const inCart = await quantityInCart(apiRequest, cart, product.id);

  let onPage = 'not checked (the product is not in the cart)';
  if (inCart !== null) {
    await cartPage.open();
    await page.reload(); // show what the server holds
    await expect(cartPage.row(PRODUCT)).toBeVisible();
    onPage = await cartPage.quantityOf(PRODUCT).inputValue();
  }

  const summary = `quantity in the cart (API): ${inCart}\nquantity shown on the cart page: ${onPage}`;
  await test.info().attach(`cart: ${label}`, { body: summary, contentType: 'text/plain' });
  console.log(`[message] cart after ${label}: API ${inCart} / cart page ${onPage}`);

  const message = `the cart holds more than ${LIMIT} ${PRODUCT}, although the product permits only ${LIMIT} per customer`;
  expect(inCart === null || inCart <= LIMIT, `${message} (API: ${inCart})`).toBe(true);
  if (inCart !== null) expect(Number(onPage) <= LIMIT, `${message} (cart page: ${onPage})`).toBe(true);
}

async function openProductWithLimit({ page, homePage, productPage, products }) {
  let product;

  await test.step('1. The product states its purchase limit (API)', async () => {
    product = await findProduct(products);
    expect(product.description, 'the product no longer states a purchase limit').toMatch(RULE);
  });

  await test.step('2. Open the home page', async () => {
    await homePage.goto();

    await expect(homePage.productNames.first()).toBeVisible();
  });

  await test.step('3. Search for the product', async () => {
    await homePage.search(PRODUCT);

    await expect(homePage.productByName(PRODUCT)).toBeVisible();
  });

  await test.step('4. Open the product page', async () => {
    await homePage.productByName(PRODUCT).click();

    await expect(page).toHaveURL(/\/product\//);
    await expect(productPage.name).toHaveText(PRODUCT);
  });

  await test.step('5. The product page shows the purchase limit', async () => {
    await expect(productPage.description).toContainText(RULE);
  });

  return product;
}

test.describe(`${PRODUCT} purchase limit (end to end)`, () => {
  test.describe.configure({ timeout: 180_000 });

  test(`adding 2 ${PRODUCT}s from the product page does not put 2 in the cart`, async ({
    page, homePage, productPage, cartPage, products, apiRequest,
  }) => {
    const cart = watchCart(page);
    const product = await openProductWithLimit({ page, homePage, productPage, products });

    await test.step('6. Set the quantity to 2', async () => {
      await productPage.increaseButton.click();

      await expect(productPage.quantity).toHaveValue('2');
    });

    await test.step('7. Try to add them to the cart', async () => {
      const attempt = await clickAddToCart(productPage, page);
      await recordAttempt('2 added from the product page', productPage, attempt);
    });

    await test.step(`8. The cart holds at most ${LIMIT}`, async () => {
      await expectWithinLimit({
        apiRequest, cart, cartPage, page, product, label: '2 added from the product page',
      });
    });
  });

  test(`raising the quantity to 2 in the cart does not give the customer 2 ${PRODUCT}s`, async ({
    page, homePage, productPage, cartPage, products, apiRequest,
  }) => {
    const cart = watchCart(page);
    const product = await openProductWithLimit({ page, homePage, productPage, products });

    await test.step('6. Add one to the cart (allowed)', async () => {
      await productPage.addToCart();
    });

    await test.step('7. The cart holds one', async () => {
      await cartPage.open();

      await expect(cartPage.row(PRODUCT)).toBeVisible();
      await expect(cartPage.quantityOf(PRODUCT)).toHaveValue('1');
    });

    await test.step('8. Change the quantity in the cart to 2', async () => {
      const update = page
        .waitForResponse((r) => r.request().method() !== 'GET' && CART_CHANGE.test(new URL(r.url()).pathname), {
          timeout: 10_000,
        })
        .catch(() => null);

      await cartPage.setQuantity(PRODUCT, 2);

      const response = await update;
      const outcome = response
        ? `HTTP ${response.status()} ${response.request().method()} ${response.request().postData()}`
        : 'the page sent no request';
      await test.info().attach('attempt: quantity changed in the cart', { body: outcome, contentType: 'text/plain' });
      console.log(`[message] quantity changed to 2 in the cart: ${outcome}`);
    });

    await test.step(`9. The cart holds at most ${LIMIT}`, async () => {
      await expectWithinLimit({
        apiRequest, cart, cartPage, page, product, label: 'quantity raised to 2 in the cart',
      });
    });
  });

  test(`adding a second ${PRODUCT} from the product page does not put 2 in the cart`, async ({
    page, homePage, productPage, cartPage, products, apiRequest,
  }) => {
    const cart = watchCart(page);
    const product = await openProductWithLimit({ page, homePage, productPage, products });

    await test.step('6. Add one to the cart (allowed)', async () => {
      await productPage.addToCart();
    });

    await test.step('7. Try to add another one', async () => {
      const attempt = await clickAddToCart(productPage, page);
      await recordAttempt('a second add from the product page', productPage, attempt);
    });

    await test.step(`8. The cart holds at most ${LIMIT}`, async () => {
      await expectWithinLimit({
        apiRequest, cart, cartPage, page, product, label: 'a second add from the product page',
      });
    });
  });

  test(`a customer can buy one ${PRODUCT}`, async ({
    page, homePage, productPage, cartPage, checkoutPage, products, newUser,
  }) => {
    const orderRequests = checkoutPage.trackOrderRequests();
    const product = await openProductWithLimit({ page, homePage, productPage, products });

    await test.step('6. Add one to the cart', async () => {
      await productPage.addToCart();
    });

    await test.step('7. Check the cart', async () => {
      await cartPage.open();

      await expect(cartPage.row(PRODUCT)).toBeVisible();
      await expect(cartPage.quantityOf(PRODUCT)).toHaveValue('1');
      await expect
        .poll(async () => parsePrice(await cartPage.total.innerText()))
        .toBeCloseTo(product.price, 2);
    });

    await test.step('8. Proceed to checkout and sign in', async () => {
      await cartPage.proceedButton.click();
      await checkoutPage.signIn(newUser.email, newUser.password);
      await checkoutPage.proceedFromSignIn.click();
    });

    await test.step('9. Enter the billing address', async () => {
      await checkoutPage.fillBillingAddress(data.checkout.address);
      await checkoutPage.waitForValidAddress();
      await checkoutPage.proceedFromAddress.click();

      await expect(checkoutPage.paymentMethod).toBeVisible();
    });

    await test.step('10. Pay by bank transfer and confirm the order', async () => {
      await checkoutPage.payWithBankTransfer(data.checkout.bank);
      mark(orderRequests, 'Confirm clicked');
    });

    await test.step('11. See the order confirmation', async () => {
      await expect(checkoutPage.successMessage).toBeVisible();
      mark(orderRequests, 'success message visible');
    });

    await reportOrderRequests(orderRequests);
  });
});