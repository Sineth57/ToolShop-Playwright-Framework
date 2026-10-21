const { test, expect } = require('../../../fixtures/test');

test.describe('Cart and checkout sign-in (negative)', () => {
  test('a guest is asked to sign in when going to checkout', async ({ cartWithProduct, cartPage, checkoutPage }) => {
    await cartPage.open();
    await cartPage.proceedButton.click();

    await expect(checkoutPage.loginSubmit).toBeVisible();
  });

  test('a wrong password at checkout sign-in shows an error', async ({ cartWithProduct, cartPage, checkoutPage, newUser }) => {
    await cartPage.open();
    await cartPage.proceedButton.click();
    await checkoutPage.signIn(newUser.email, 'WrongPassword!123');

    await expect(checkoutPage.loginError).toBeVisible();
    await expect(checkoutPage.proceedFromSignIn).toBeHidden();
  });

  test('an empty cart has no product rows', async ({ cartPage }) => {
    await cartPage.goto();

    await expect(cartPage.rows).toHaveCount(0);
  });
});