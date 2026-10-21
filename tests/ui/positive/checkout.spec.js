const { test, expect } = require('../../../fixtures/test');
const { InvoicesApi } = require('../../../api/InvoicesApi');
const data = require('../../../test-data/ui-data.json');

test.describe('Checkout (positive)', () => {
  // Every test starts at the billing address step: product in cart, signed in at checkout
  test.beforeEach(async ({ cartWithProduct, cartPage, checkoutPage, newUser }) => {
    await cartPage.open();
    await cartPage.proceedButton.click();
    await checkoutPage.signIn(newUser.email, newUser.password);
    await checkoutPage.proceedFromSignIn.click();
  });

  test('the billing step shows all address fields', async ({ checkoutPage }) => {
    const fields = [
      checkoutPage.country, checkoutPage.postalCode, checkoutPage.houseNumber,
      checkoutPage.street, checkoutPage.city, checkoutPage.state,
    ];

    for (const field of fields) {
      await expect(field).toBeVisible();
    }
  });

  test('choosing bank transfer shows the bank detail fields', async ({ checkoutPage }) => {
    await checkoutPage.goToPayment(data.checkout.address);
    await checkoutPage.paymentMethod.selectOption('bank-transfer');

    await expect(checkoutPage.bankName).toBeVisible();
    await expect(checkoutPage.accountName).toBeVisible();
    await expect(checkoutPage.accountNumber).toBeVisible();
  });

  test('a bank transfer purchase shows the success message', async ({ checkoutPage }) => {
    await checkoutPage.goToPayment(data.checkout.address);
    await checkoutPage.payWithBankTransfer(data.checkout.bank);

    await expect(checkoutPage.successMessage).toBeVisible();
  });

  test('the purchase creates an invoice', async ({ checkoutPage, newUser, authApi, apiRequest }) => {
    // Known issue (project issue #844): the first Confirm shows "Payment was successful"
    // but creates no invoice. test.fail() keeps the correct expectation and flags the test
    // when the bug is fixed.
    test.fail(true, 'Known issue #844: first Confirm shows success without creating an invoice');

    await checkoutPage.goToPayment(data.checkout.address);
    await checkoutPage.payWithBankTransfer(data.checkout.bank);
    await expect(checkoutPage.successMessage).toBeVisible();

    const token = await authApi.getToken(newUser.email, newUser.password);
    await expect
      .poll(() => new InvoicesApi(apiRequest).count(token), { timeout: 15_000 })
      .toBeGreaterThan(0);
  });

  test('confirming a second time creates the invoice', async ({ checkoutPage, newUser, authApi, apiRequest }) => {
    // The workaround for issue #844: a second Confirm does create the order
    await checkoutPage.goToPayment(data.checkout.address);
    await checkoutPage.payWithBankTransfer(data.checkout.bank);
    await expect(checkoutPage.successMessage).toBeVisible();
    await checkoutPage.confirm();

    const token = await authApi.getToken(newUser.email, newUser.password);
    await expect
      .poll(() => new InvoicesApi(apiRequest).count(token), { timeout: 20_000 })
      .toBeGreaterThan(0);
  });
});