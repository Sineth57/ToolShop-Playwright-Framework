const { test, expect } = require('../../fixtures/test');
const { InvoicesApi } = require('../../api/InvoicesApi');
const { uniqueEmail } = require('../../utils/userFactory');
const { parsePrice } = require('../../utils/price');
const { mark, reportOrderRequests, expectKnownIssue } = require('../../utils/orderReport');
const data = require('../../test-data/ui-data.json');

async function expectCartBadge(productPage, count, where) {
  await expect
    .poll(() => productPage.cartCount(), { message: `the cart badge should show ${count} ${where}` })
    .toBe(count);
}

// cart page lists the product once with quantity 1 and the real price as the total
async function expectCartHoldsProduct(cartPage, product) {
  await expect(cartPage.row(product.name)).toBeVisible();
  await expect(cartPage.quantityOf(product.name)).toHaveValue('1');
  await expect.poll(async () => parsePrice(await cartPage.total.innerText())).toBeCloseTo(product.price, 2);
}

// product page > cart > checkout signin step > register link > register > login > cart > checkout > payment
async function runRegisterInCheckoutFlow({
  page, registerPage, loginPage, productPage, cartPage, checkoutPage, product,
}) {
  const customer = { ...data.registration, email: uniqueEmail('e2e') };
  const orderRequests = checkoutPage.trackOrderRequests();

  await test.step('1. A guest adds a product to the cart', async () => {
    await productPage.goto(product.id);
    await expect(productPage.name).toHaveText(product.name);
    await expect(loginPage.nav.signIn).toBeVisible();

    await productPage.addToCart();
  });

  await test.step('2. The cart holds the product', async () => {
    await cartPage.open();

    await expectCartHoldsProduct(cartPage, product);
  });

  await test.step('3. Proceed to checkout: the sign-in step is shown', async () => {
    await cartPage.proceedButton.click();

    await expect(checkoutPage.loginSubmit).toBeVisible();
  });

  await test.step('4. Click the register link on the sign-in step', async () => {
    await checkoutPage.registerLink.click();

    await expect(page).toHaveURL(/auth\/register/);
    await expectCartBadge(productPage, 1, 'on the registration page');
  });

  await test.step('5. Register a new account', async () => {
    await registerPage.fillForm(customer);
    await registerPage.submit();

    await expect(page).toHaveURL(/auth\/login/);
    await expectCartBadge(productPage, 1, 'after registering');
  });

  await test.step('6. Log in with the new account', async () => {
    await loginPage.login(customer.email, customer.password);

    await expect(loginPage.nav.signIn).toBeHidden();
    await expectCartBadge(productPage, 1, 'after logging in');
  });

  await test.step('7. The cart still holds the product', async () => {
    await cartPage.open();

    await expectCartHoldsProduct(cartPage, product);
  });

  await test.step('8. Proceed to checkout (the customer is now signed in)', async () => {
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

  return { customer, orderRequests };
}

test.describe('Registering in the middle of the checkout (end to end)', () => {
  test.describe.configure({ timeout: 240_000 });

  test('a guest registers from the checkout sign-in step, logs in and completes the purchase', async ({
    page, registerPage, loginPage, productPage, cartPage, checkoutPage, product,
  }) => {
    const { orderRequests } = await runRegisterInCheckoutFlow({
      page, registerPage, loginPage, productPage, cartPage, checkoutPage, product,
    });

    await reportOrderRequests(orderRequests);
  });

  test('the order of the customer who registered in the checkout creates an invoice', async ({
    page, registerPage, loginPage, productPage, cartPage, checkoutPage, product, authApi, apiRequest,
  }) => {
    const { customer, orderRequests } = await runRegisterInCheckoutFlow({
      page, registerPage, loginPage, productPage, cartPage, checkoutPage, product,
    });

    await test.step('12. Check that the order exists (through the API)', async () => {
      const token = await authApi.getToken(customer.email, customer.password);
      try {
       
        await expectKnownIssue(
          'Known issue: the success message appears but no invoice is created',
          () => expect.poll(() => new InvoicesApi(apiRequest).count(token), { timeout: 15_000 }).toBeGreaterThan(0),
        );
      } finally {
        await reportOrderRequests(orderRequests);
      }
    });
  });

  test('going back from the registration page keeps the guest\'s cart', async ({
    page, productPage, cartPage, checkoutPage, product,
  }) => {
    await test.step('1. A guest adds a product and reaches the sign-in step', async () => {
      await productPage.goto(product.id);
      await expect(productPage.name).toHaveText(product.name);
      await productPage.addToCart();
      await cartPage.open();
      await cartPage.proceedButton.click();

      await expect(checkoutPage.loginSubmit).toBeVisible();
    });

    await test.step('2. Open the registration page, then change your mind and go back', async () => {
      await checkoutPage.registerLink.click();
      await expect(page).toHaveURL(/auth\/register/);

      await page.goBack();

      await expect(page).toHaveURL(/checkout/);
      await expectCartBadge(productPage, 1, 'after going back');
    });

    await test.step('3. The cart still holds the product', async () => {
      await cartPage.goto();

      await expectCartHoldsProduct(cartPage, product);
    });
  });
});