const { NavBar } = require('./components/NavBar');

class LoginPage {
  constructor(page) {
    this.page = page;
    this.nav = new NavBar(page);
    this.form = page.getByTestId('login-form');
    this.emailInput = page.getByTestId('email');
    this.passwordInput = page.getByTestId('password');
    this.submitButton = page.getByTestId('login-submit');
    this.emailError = page.getByTestId('email-error');
    this.passwordError = page.getByTestId('password-error');
    this.loginError = page.getByTestId('login-error');
    this.registerLink = page.getByTestId('register-link');
    this.forgotPasswordLink = page.getByTestId('forgot-password-link');

    // The eye icon next to the password (the button without text, as recorded with codegen)
    this.passwordToggle = this.form.getByRole('button').filter({ hasText: /^$/ }).first();

    // Whichever message the form shows (a field error or the login error)
    this.anyError = this.emailError.or(this.passwordError).or(this.loginError);
  }

  async goto() {
    await this.page.goto('/auth/login');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

module.exports = { LoginPage };