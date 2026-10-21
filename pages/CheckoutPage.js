const { expect } = require('@playwright/test');

class CheckoutPage {
  constructor(page) {
    this.page = page;

    // Step 2: sign in (shown to guests) and the "continue" button
    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.loginSubmit = page.getByTestId('login-submit');
    this.loginError = page.getByTestId('login-error');
    this.proceedFromSignIn = page.getByTestId('proceed-2');

    // Step 3: billing address
    this.country = page.getByTestId('country');
    this.postalCode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.street = page.getByTestId('street');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.proceedFromAddress = page.getByTestId('proceed-3');

    // Step 4: payment
    this.paymentMethod = page.getByTestId('payment-method');
    this.bankName = page.getByTestId('bank_name');
    this.accountName = page.getByTestId('account_name');
    this.accountNumber = page.getByTestId('account_number');
    this.finish = page.getByTestId('finish');
    this.successMessage = page.getByText('Payment was successful');
  }

  async signIn(email, password) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.loginSubmit.click();
  }

  // The form is pre-filled from the user's profile shortly after it appears. Typing before that
  // finishes lets the profile data overwrite the test's input, so wait for the pre-fill first.
  async waitForFormToLoad() {
    await expect(this.postalCode).not.toHaveValue('');
  }

  // The site fills street, city and state itself once country, postcode and house number are known
  async fillBillingAddress({ country, postalCode, houseNumber }) {
    await this.waitForFormToLoad();
    await this.country.selectOption(country);
    await this.postalCode.fill(postalCode);
    await this.houseNumber.fill(houseNumber);
    await this.houseNumber.press('Tab');

    // Confirm the typed values stayed in place
    await expect(this.country).toHaveValue(country);
    await expect(this.postalCode).toHaveValue(postalCode);
    await expect(this.houseNumber).toHaveValue(houseNumber);
  }

  // The Proceed button stays disabled until the address is complete (including the autofilled part)
  async waitForValidAddress() {
    await expect(this.proceedFromAddress).toBeEnabled({ timeout: 30_000 });
  }

  async goToPayment(address) {
    await this.fillBillingAddress(address);
    await this.waitForValidAddress();
    await this.proceedFromAddress.click();
    await expect(this.paymentMethod).toBeVisible();
  }

  async payWithBankTransfer({ bankName, accountName, accountNumber }) {
    await this.paymentMethod.selectOption('bank-transfer');
    await this.bankName.fill(bankName);
    await this.accountName.fill(accountName);
    await this.accountNumber.fill(accountNumber);
    await this.confirm();
  }

  async confirm() {
    await this.finish.click();
  }

  // Records every payment and invoice request the page sends: the status the API answered, the
  // data sent to /invoices (billing address and payment details) and the error text of failed
  // calls. Returns the list, which fills up as requests happen.
  trackOrderRequests() {
    const calls = [];
    this.page.on('response', (response) => {
      const request = response.request();
      const { pathname } = new URL(response.url());
      if (request.method() !== 'POST' || !/\/(invoices|payment)/.test(pathname)) return;

      const call = { line: `${response.status()} POST ${pathname}`, detail: '', ready: Promise.resolve() };
      calls.push(call);

      const sent = pathname.includes('/invoices') ? (request.postData() || '').slice(0, 600) : '';
      call.ready = (async () => {
        const received = response.status() >= 400 ? (await response.text().catch(() => '')).slice(0, 600) : '';
        call.detail = [sent && `  sent:     ${sent}`, received && `  received: ${received}`]
          .filter(Boolean)
          .join('\n');
      })();
    });
    return calls;
  }
}

module.exports = { CheckoutPage };