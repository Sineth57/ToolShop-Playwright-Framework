const { test, expect } = require('../../../fixtures/test');
const data = require('../../../test-data/ui-data.json');

test.describe('Checkout (negative)', () => {
  test.beforeEach(async ({ cartWithProduct, cartPage, checkoutPage, newUser }) => {
    await cartPage.open();
    await cartPage.proceedButton.click();
    await checkoutPage.signIn(newUser.email, newUser.password);
    await checkoutPage.proceedFromSignIn.click();
  });

  for (const { field, key } of data.checkout.requiredAddressFields) {
    test(`TC096 - cannot continue to payment with an empty ${field}`, async ({ checkoutPage }) => {
      
      await checkoutPage.fillBillingAddress(data.checkout.address);
      await checkoutPage.waitForValidAddress();

      // a missing field disables it again so the payment step cannot be reached
      await checkoutPage[key].fill('');

      await expect(checkoutPage.proceedFromAddress).toBeDisabled();
      await expect(checkoutPage.paymentMethod).toBeHidden();
    });
  }

  test('TC097 - empty bank details show validation messages', async ({ checkoutPage, page }) => {
    await checkoutPage.goToPayment(data.checkout.address);
    await checkoutPage.paymentMethod.selectOption('bank-transfer');

    await checkoutPage.bankName.click();
    await checkoutPage.accountName.click();
    await checkoutPage.accountNumber.click();
    await checkoutPage.bankName.click();

    await expect(page.getByText(/Bank name can only contain/i)).toBeVisible();
    await expect(page.getByText(/Account name can contain/i)).toBeVisible();
  });
});