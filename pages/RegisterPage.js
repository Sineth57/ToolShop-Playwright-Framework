class RegisterPage {
  constructor(page) {
    this.page = page;
    this.form = page.getByTestId('register-form');
    this.firstName = page.getByTestId('first-name');
    this.lastName = page.getByTestId('last-name');
    this.dob = page.getByTestId('dob');
    this.country = page.getByTestId('country');
    this.postalCode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.street = page.getByTestId('street');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.phone = page.getByTestId('phone');
    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.submitButton = page.getByTestId('register-submit');

    // eye icon next to the password
    this.passwordToggle = this.form.getByRole('button').filter({ hasText: /^$/ }).first();

    // validation message
    this.anyMessage = page.locator('.alert-danger, [data-test$="-error"]');
  }

  async goto() {
    await this.page.goto('/auth/register');
  }

  field(testId) {
    return this.page.getByTestId(testId);
  }

  // validation message(email-error)
  error(testId) {
    return this.page.getByTestId(testId);
  }

  async fillForm(d) {
    await this.firstName.fill(d.firstName);
    await this.lastName.fill(d.lastName);
    await this.dob.fill(d.dob);
    await this.country.selectOption(d.country);
    await this.postalCode.fill(d.postalCode);
    await this.houseNumber.fill(d.houseNumber);
    await this.street.fill(d.street);
    await this.city.fill(d.city);
    await this.state.fill(d.state);
    await this.phone.fill(d.phone);
    await this.email.fill(d.email);
    await this.password.fill(d.password);
  }

  async submit() {
    await this.submitButton.click();
  }
}

module.exports = { RegisterPage };