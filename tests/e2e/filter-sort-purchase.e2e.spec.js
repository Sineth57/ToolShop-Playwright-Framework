const { test, expect } = require('../../fixtures/test');
const { uniqueEmail } = require('../../utils/userFactory');
const { parsePrice } = require('../../utils/price');
const { mark, reportOrderRequests } = require('../../utils/orderReport');
const data = require('../../test-data/ui-data.json');

test.describe('Filter and purchase a product', () => {
  test('a customer filters products before completing a purchase', async ({
    page,
    registerPage,
    loginPage,
    homePage,
    productPage,
    cartPage,
    checkoutPage,
  }) => {
    const customer = {
      ...data.registration,
      email: uniqueEmail('e2e'),
    };

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

    await test.step('4. Search for a product', async () => {
      await homePage.search(data.searchTerms[0]);

      await expect(homePage.productNames.first()).toBeVisible();
      await expect(homePage.productNames).not.toHaveCount(0);
    });

    await test.step('5. Open the first matching search result', async () => {
      productName = (await homePage.names())[0];

      await homePage.productNames.first().click();

      await expect(page).toHaveURL(/\/product\//);
      await expect(productPage.name).toHaveText(productName);
      await expect(productPage.unitPrice).toHaveText(/\d/);

      unitPrice = parsePrice(await productPage.unitPrice.innerText());
    });

    await test.step('6. Add the product to the cart', async () => {
      await productPage.addToCart();
    });

    await test.step('7. Verify the cart', async () => {
      await cartPage.open();

      await expect(cartPage.row(productName)).toBeVisible();
      await expect(cartPage.quantityOf(productName)).toHaveValue('1');

      await expect
        .poll(async () => parsePrice(await cartPage.total.innerText()))
        .toBeCloseTo(unitPrice, 2);
    });

    await test.step('8. Proceed to checkout', async () => {
      await cartPage.proceedButton.click();

      await expect(checkoutPage.proceedFromSignIn).toBeVisible();
      await checkoutPage.proceedFromSignIn.click();
    });

    await test.step('9. Enter the billing address', async () => {
      await checkoutPage.fillBillingAddress(data.checkout.address);
      await checkoutPage.waitForValidAddress();

      await checkoutPage.proceedFromAddress.click();

      // Wait for the payment step to become visible.
      await expect(checkoutPage.paymentMethod).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step('10. Pay by bank transfer', async () => {
      await checkoutPage.payWithBankTransfer(data.checkout.bank);
      mark(orderRequests, 'Confirm clicked');
    });

    await test.step('11. Verify order confirmation', async () => {
      await expect(checkoutPage.successMessage).toBeVisible();
      mark(orderRequests, 'success message visible');
    });

    await test.afterEach;
  });
});