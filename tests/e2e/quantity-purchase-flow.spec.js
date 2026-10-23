const { test, expect } = require('../../fixtures/test');
const { InvoicesApi } = require('../../api/InvoicesApi');
const { parsePrice } = require('../../utils/price');
const { mark, reportOrderRequests } = require('../../utils/orderReport');
const data = require('../../test-data/ui-data.json');

const QUANTITY = 2;

// A returning customer buys two of a product they find on the home page:
// log in > home page > search or filter > open the product > quantity 2 > add to cart > cart > checkout > payment
//
// `how` says how the product is found on the home page: 'search' or 'filter' (by its brand).
async function runQuantityFlow(how, { page, loginPage, homePage, productPage, cartPage, checkoutPage, newUser, product, apiRequest }) {
  const orderRequests = checkoutPage.trackOrderRequests();

  await test.step('1. Log in', async () => {
    await loginPage.goto();
    await loginPage.login(newUser.email, newUser.password);

    await expect(loginPage.nav.signIn).toBeHidden();
  });

  await test.step('2. Go to the home page', async () => {
    await homePage.nav.home.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(homePage.productNames.first()).toBeVisible();
  });

  if (how === 'search') {
    await test.step('3. Search for the product by its name', async () => {
      await homePage.search(product.name);

      await expect(homePage.productByName(product.name)).toBeVisible();
    });
  } else {
    await test.step('3. Filter the products by the brand of the product', async () => {
      const brandId = product.brand?.id;
      expect(brandId, 'the product has no brand id').toBeTruthy();
      // The expected number of products comes from the API
      const expected = await (await apiRequest.get('/products', { params: { by_brand: brandId } })).json();

      await homePage.brandFilter(brandId).check();

      await expect(homePage.brandFilter(brandId)).toBeChecked();
      await expect(homePage.productNames).toHaveCount(Math.min(expected.total, expected.per_page));
      await expect(homePage.productByName(product.name)).toBeVisible();
    });
  }

  await test.step('4. Open the product', async () => {
    await homePage.productByName(product.name).click();

    await expect(page).toHaveURL(/\/product\//);
    await expect(productPage.name).toHaveText(product.name);
  });

  await test.step(`5. Change the quantity to ${QUANTITY}`, async () => {
    await expect(productPage.quantity).toHaveValue('1');
    await productPage.increaseButton.click();

    await expect(productPage.quantity).toHaveValue(String(QUANTITY));
  });

  await test.step('6. Add the product to the cart', async () => {
    await productPage.addToCart();
  });

  await test.step('7. Check the cart', async () => {
    await cartPage.open();

    await expect(cartPage.row(product.name)).toBeVisible();
    await expect(cartPage.quantityOf(product.name)).toHaveValue(String(QUANTITY));
    await expect
      .poll(async () => parsePrice(await cartPage.lineTotalOf(product.name).innerText()))
      .toBeCloseTo(product.price * QUANTITY, 2);
    await expect
      .poll(async () => parsePrice(await cartPage.total.innerText()))
      .toBeCloseTo(product.price * QUANTITY, 2);
  });

  await test.step('8. Proceed to checkout (the customer is already signed in)', async () => {
    await cartPage.proceedButton.click();
    await expect(checkoutPage.proceedFromSignIn).toBeVisible();
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

test.describe('Returning customer buys two of a product (end to end)', () => {
  // A long journey on a slow shared demo needs more than the default minute
  test.describe.configure({ timeout: 180_000 });

  for (const how of ['search', 'filter']) {
    test(`a customer finds a product by ${how}, buys ${QUANTITY} of it and sees the order confirmation`, async ({
      page, loginPage, homePage, productPage, cartPage, checkoutPage, newUser, product, apiRequest,
    }) => {
      const { orderRequests } = await runQuantityFlow(how, {
        page, loginPage, homePage, productPage, cartPage, checkoutPage, newUser, product, apiRequest,
      });

      await reportOrderRequests(orderRequests);
    });
  }

  test('the order of two products creates an invoice', async ({
    page, loginPage, homePage, productPage, cartPage, checkoutPage, newUser, product, apiRequest, authApi,
  }) => {
    // Known issue: after the first Confirm the site shows "Payment was successful", but the order
    // request (POST /invoices) is often refused with HTTP 422 and no invoice exists. test.fail()
    // keeps the correct expectation and flags this test when the bug is fixed.
    test.fail(true, 'Known issue: the success message appears but no invoice is created');

    const { orderRequests } = await runQuantityFlow('search', {
      page, loginPage, homePage, productPage, cartPage, checkoutPage, newUser, product, apiRequest,
    });

    await test.step('12. Check that the order exists (through the API)', async () => {
      const token = await authApi.getToken(newUser.email, newUser.password);
      try {
        await expect
          .poll(() => new InvoicesApi(apiRequest).count(token), { timeout: 15_000 })
          .toBeGreaterThan(0);
      } finally {
        await reportOrderRequests(orderRequests);
      }
    });
  });
});