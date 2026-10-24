
const { test, expect } = require('../../fixtures/test');
const { uniqueEmail } = require('../../utils/userFactory');
const { parsePrice } = require('../../utils/price');
const data = require('../../test-data/ui-data.json');

async function prepareCart({page, registerPage, loginPage, homePage, productPage, cartPage}) {
  const customer = {
    ...data.registration,
    email: uniqueEmail('cart-e2e'),
  };

  let productName;
  let unitPrice;

  await test.step('1. Register a new customer', async () => {
    await registerPage.goto();
    await registerPage.fillForm(customer);
    await registerPage.submit();

    await expect(page).toHaveURL(/auth\/login/);
  });

  await test.step('2. Log in with the new account', async () => {
    await loginPage.login(customer.email, customer.password);

    await expect(loginPage.nav.signIn).toBeHidden();
  });

  await test.step('3. Open the home page', async () => {
    await homePage.nav.home.click();

    await expect(homePage.productNames.first()).toBeVisible();
  });

  await test.step('4. Open a product and add it to the cart', async () => {
    productName = (await homePage.names())[0];

    await homePage.productNames.first().click();
    
    await expect(productPage.name).toHaveText(productName);

    unitPrice = parsePrice(
      await productPage.unitPrice.innerText()
    );

    await productPage.addToCart();
  });

  await test.step('5. Open the cart', async () => {
    await cartPage.open();

    await expect(cartPage.row(productName)).toBeVisible();
    await expect(cartPage.quantityOf(productName)).toHaveValue('1');
  });

  return { productName, unitPrice };
}

test.describe('Cart management E2E tests', () => {
  test.describe.configure({ timeout: 180_000 });

  test('a customer can increase product quantity and see the updated total', async ({
    page,
    registerPage,
    loginPage,
    homePage,
    productPage,
    cartPage,
  }) => {
    const { productName, unitPrice } = await prepareCart({
      page,
      registerPage,
      loginPage,
      homePage,
      productPage,
      cartPage,
    });

    await test.step('6. Increase the product quantity to two', async () => {
      await cartPage.setQuantity(productName, 2);

      await expect(cartPage.quantityOf(productName)).toHaveValue('2');
    });

    await test.step('7. Verify the cart total', async () => {
      await expect
        .poll(
          async () => parsePrice(await cartPage.total.innerText()),
          { timeout: 10_000 }
        )
        .toBeCloseTo(unitPrice * 2, 2);
    });
  });

  test('a customer can remove a product from the cart', async ({
    page,
    registerPage,
    loginPage,
    homePage,
    productPage,
    cartPage,
  }) => {
    const { productName } = await prepareCart({
      page,
      registerPage,
      loginPage,
      homePage,
      productPage,
      cartPage,
    });

    await test.step('6. Remove the product', async () => {
      await cartPage.remove(productName);
    });

    await test.step('7. Verify the product is removed', async () => {
      await expect(cartPage.row(productName)).toHaveCount(0);
    });
  });
});
