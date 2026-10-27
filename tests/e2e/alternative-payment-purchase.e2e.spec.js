
const { test, expect } = require('../../fixtures/test');
const { uniqueEmail } = require('../../utils/userFactory');
const data = require('../../test-data/ui-data.json');

test('Inspect payment methods during a complete checkout flow', async ({
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
    email: uniqueEmail('payment'),
  };

  await test.step('1. Register a new customer', async () => {
    await registerPage.goto();
    await registerPage.fillForm(customer);
    await registerPage.submit();

    await expect(page).toHaveURL(/auth\/login/);
  });

  await test.step('2. Log in with the new customer', async () => {
    await loginPage.login(customer.email, customer.password);
    await expect(loginPage.nav.signIn).toBeHidden();
  });

  await test.step('3. Open a product', async () => {
    await homePage.nav.home.click();
    await expect(homePage.productNames.first()).toBeVisible();

    await homePage.productNames.first().click();

    await expect(page).toHaveURL(/\/product\//);
    await expect(productPage.name).toBeVisible();
  });

  
await test.step('4. Add the product to the cart', async () => {
  // Capture the product name before navigating away
  const productName = (await productPage.name.innerText()).trim();

  await productPage.addToCart();

  await cartPage.open();

  // Verify the product is present in the cart
  await expect(cartPage.row(productName)).toBeVisible();
});


  await test.step('5. Proceed to checkout', async () => {
    await cartPage.proceedButton.click();

    await expect(checkoutPage.proceedFromSignIn).toBeVisible();
    await checkoutPage.proceedFromSignIn.click();
  });

  await test.step('6. Complete the billing address', async () => {
    await checkoutPage.fillBillingAddress(data.checkout.address);
    await checkoutPage.waitForValidAddress();
    await checkoutPage.proceedFromAddress.click();

    await expect(checkoutPage.paymentMethod).toBeVisible();
  });

  await test.step('7. Print the available payment methods', async () => {
    const methods = await checkoutPage.getPaymentMethods();

    console.log('Available payment methods:', methods);

    expect(methods.length).toBeGreaterThan(0);
  });
});
