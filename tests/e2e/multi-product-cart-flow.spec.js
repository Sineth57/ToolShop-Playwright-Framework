const { test, expect } = require('../../fixtures/test');
const { CategoryPage } = require('../../pages/CategoryPage');
const { InvoicesApi } = require('../../api/InvoicesApi');
const { parsePrice } = require('../../utils/price');
const { mark, reportOrderRequests, expectKnownIssue } = require('../../utils/orderReport');
const data = require('../../test-data/ui-data.json');
const { multiProductCart } = require('../../test-data/e2e-data.json');

const RAISED = multiProductCart.raisedQuantity;

// Checks the whole cart: which lines it holds, their quantities, line totals and the cart total.
// `lines` is a list of { product, quantity }, and the expected prices come from the API.
async function expectCart(cartPage, lines) {
  await expect(cartPage.rows).toHaveCount(lines.length);

  for (const { product, quantity } of lines) {
    await expect(cartPage.quantityOf(product.name)).toHaveValue(String(quantity));
    await expect
      .poll(async () => parsePrice(await cartPage.lineTotalOf(product.name).innerText()))
      .toBeCloseTo(product.price * quantity, 2);
  }

  const expectedTotal = lines.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
  await expect
    .poll(async () => parsePrice(await cartPage.total.innerText()))
    .toBeCloseTo(expectedTotal, 2);
}

// A customer fills a cart from two categories, changes one quantity, removes one product and pays:
// home page > category 1 > product A > category 2 > product B > category 1 > product C
// > cart (3 lines) > A: quantity 3 > remove C > checkout (sign in) > billing address > payment
async function runMultiProductFlow({
  page, homePage, productPage, cartPage, checkoutPage, newUser, apiRequest,
}) {
  const categoryPage = new CategoryPage(page);
  const orderRequests = checkoutPage.trackOrderRequests();
  const { firstCategory, secondCategory } = multiProductCart;

  // Opens a product from the category list and reads its real price from the API
  async function openProduct(name) {
    await categoryPage.product(name).click();
    await expect(page).toHaveURL(/\/product\//);
    await expect(productPage.name).toHaveText(name);

    const id = new URL(page.url()).pathname.split('/').pop();
    const response = await apiRequest.get(`/products/${id}`);
    expect(response.status(), `could not read product ${id} from the API`).toBe(200);
    const { price } = await response.json();

    await expect(productPage.unitPrice).toHaveText(/\d/);
    expect(parsePrice(await productPage.unitPrice.innerText()), 'the price on the page differs from the API').toBeCloseTo(price, 2);
    return { name, id, price };
  }

  let productA;
  let productB;
  let productC;

  await test.step('1. Open the home page', async () => {
    await homePage.goto();

    await expect(homePage.productNames.first()).toBeVisible();
  });

  await test.step('2. Open the first category from the menu and add its first product (A)', async () => {
    const names = await categoryPage.openFromMenu(firstCategory);
    productA = await openProduct(names[0]);
    await productPage.addToCart(1);
  });

  await test.step('3. Open the second category from the menu and add its first product (B)', async () => {
    const names = await categoryPage.openFromMenu(secondCategory);
    productB = await openProduct(names[0]);
    await productPage.addToCart(2);
  });

  await test.step('4. Go back to the first category and add its second product (C)', async () => {
    const names = await categoryPage.openFromMenu(firstCategory);
    productC = await openProduct(names[1]);
    await productPage.addToCart(3);

    const chosen = [productA.name, productB.name, productC.name];
    expect(new Set(chosen).size, `the three products must be different: ${chosen.join(', ')}`).toBe(3);
  });

  await test.step('5. The cart holds the three products', async () => {
    await cartPage.open();

    await expectCart(cartPage, [
      { product: productA, quantity: 1 },
      { product: productB, quantity: 1 },
      { product: productC, quantity: 1 },
    ]);
  });

  await test.step(`6. Change the quantity of product A to ${RAISED}`, async () => {
    await cartPage.setQuantity(productA.name, RAISED);

    await expectCart(cartPage, [
      { product: productA, quantity: RAISED },
      { product: productB, quantity: 1 },
      { product: productC, quantity: 1 },
    ]);
  });

  await test.step('7. Remove product C', async () => {
    await cartPage.remove(productC.name);

    await expect(cartPage.row(productC.name)).toHaveCount(0);
    await expectCart(cartPage, [
      { product: productA, quantity: RAISED },
      { product: productB, quantity: 1 },
    ]);
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

  return { orderRequests };
}

test.describe('Multi-product cart (end to end)', () => {
  // A long journey on a slow shared demo needs more than the default minute
  test.describe.configure({ timeout: 240_000 });

  test('a customer builds a cart from two categories, changes a quantity, removes a product and pays', async ({
    page, homePage, productPage, cartPage, checkoutPage, newUser, apiRequest,
  }) => {
    const { orderRequests } = await runMultiProductFlow({
      page, homePage, productPage, cartPage, checkoutPage, newUser, apiRequest,
    });

    await reportOrderRequests(orderRequests);
  });

  test('the order from the multi-product cart creates an invoice', async ({
    page, homePage, productPage, cartPage, checkoutPage, newUser, apiRequest, authApi,
  }) => {
    // The journey itself must work: a failure in steps 1 to 11 fails this test
    const { orderRequests } = await runMultiProductFlow({
      page, homePage, productPage, cartPage, checkoutPage, newUser, apiRequest,
    });

    await test.step('12. Check that the order exists (through the API)', async () => {
      const token = await authApi.getToken(newUser.email, newUser.password);
      try {
        // Known issue: after the first Confirm the site shows "Payment was successful", but the
        // order request (POST /invoices) is often refused with HTTP 422 and no invoice exists
        await expectKnownIssue(
          'Known issue: the success message appears but no invoice is created',
          () => expect.poll(() => new InvoicesApi(apiRequest).count(token), { timeout: 15_000 }).toBeGreaterThan(0),
        );
      } finally {
        await reportOrderRequests(orderRequests);
      }
    });
  });
});