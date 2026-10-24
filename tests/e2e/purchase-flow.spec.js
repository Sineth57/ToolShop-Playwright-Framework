const { test, expect } = require('../../fixtures/test');
const { InvoicesApi } = require('../../api/InvoicesApi');
const { uniqueEmail } = require('../../utils/userFactory');
const { parsePrice } = require('../../utils/price');
const { mark, reportOrderRequests } = require('../../utils/orderReport');
const data = require('../../test-data/ui-data.json');

// register > log in > home page > open a product > add it to the cart > cart > checkout > payment
async function runPurchaseFlow({ page, registerPage, loginPage, homePage, productPage, cartPage, checkoutPage }) {
  const customer = { ...data.registration, email: uniqueEmail('e2e') };
  const orderRequests = checkoutPage.trackOrderRequests();
  let productName;
  let unitPrice;

  await test.step('1. Register a new account', async () => {
    await registerPage.goto();
    await registerPage.fillForm(customer);
    await registerPage.submit();

    await expect(page).toHaveURL(/auth\/login/);
  });

  await test.step('2. Log in with the new account', async () => {
    await loginPage.login(customer.email, customer.password);

    await expect(loginPage.nav.signIn).toBeHidden();
  });

  await test.step('3. Go to the home page', async () => {
    await homePage.nav.home.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(homePage.productNames.first()).toBeVisible();
  });

  await test.step('4. Open the first product', async () => {
    productName = (await homePage.names())[0];
    await homePage.productNames.first().click();

    await expect(page).toHaveURL(/\/product\//);
    await expect(productPage.name).toHaveText(productName);
    await expect(productPage.unitPrice).toHaveText(/\d/);
    unitPrice = parsePrice(await productPage.unitPrice.innerText());
  });

  await test.step('5. Add the product to the cart', async () => {
    await productPage.addToCart();
  });

  await test.step('6. Check the cart', async () => {
    await cartPage.open();

    await expect(cartPage.row(productName)).toBeVisible();
    await expect(cartPage.quantityOf(productName)).toHaveValue('1');
    await expect.poll(async () => parsePrice(await cartPage.total.innerText())).toBeCloseTo(unitPrice, 2);
  });

  await test.step('7. Proceed to checkout (the customer is already signed in)', async () => {
    await cartPage.proceedButton.click();
    await expect(checkoutPage.proceedFromSignIn).toBeVisible();
    await checkoutPage.proceedFromSignIn.click();
  });

  await test.step('8. Enter the billing address', async () => {
    await checkoutPage.fillBillingAddress(data.checkout.address);
    await checkoutPage.waitForValidAddress();
    await checkoutPage.proceedFromAddress.click();

    await expect(checkoutPage.paymentMethod).toBeVisible();
  });

  await test.step('9. Pay by bank transfer and confirm the order', async () => {
    await checkoutPage.payWithBankTransfer(data.checkout.bank);
    mark(orderRequests, 'Confirm clicked');
  });

  await test.step('10. See the order confirmation', async () => {
    await expect(checkoutPage.successMessage).toBeVisible();
    mark(orderRequests, 'success message visible');
  });

  return { customer, productName, unitPrice, orderRequests };
}

test.describe('Full purchase flow (end to end)', () => {
  test.describe.configure({ timeout: 180_000 });

  test('a new customer registers, logs in, buys a product and sees the order confirmation', async ({
    page, registerPage, loginPage, homePage, productPage, cartPage, checkoutPage,
  }) => {
    const { orderRequests } = await runPurchaseFlow({
      page, registerPage, loginPage, homePage, productPage, cartPage, checkoutPage,
    });

    await reportOrderRequests(orderRequests);
  });

  test('the purchase made through the full flow creates an invoice', async ({
    page, registerPage, loginPage, homePage, productPage, cartPage, checkoutPage, authApi, apiRequest,
  }) => {
    test.fail(true, 'Known issue: the success message appears but no invoice is created');

    const { customer, orderRequests } = await runPurchaseFlow({
      page, registerPage, loginPage, homePage, productPage, cartPage, checkoutPage,
    });

    await test.step('11. Check that the order exists (through the API)', async () => {
      const token = await authApi.getToken(customer.email, customer.password);
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