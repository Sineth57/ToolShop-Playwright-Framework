const { NavBar } = require('./components/NavBar');

class ContactPage {
  constructor(page) {
    this.page = page;
    this.nav = new NavBar(page);
    this.firstName = page.getByTestId('first-name');
    this.lastName = page.getByTestId('last-name');
    this.email = page.getByTestId('email');
    this.subject = page.getByTestId('subject');
    this.message = page.getByTestId('message');
    this.attachment = page.getByTestId('attachment');
    this.submitButton = page.getByTestId('contact-submit');
  }

  async goto() {
    await this.page.goto('/contact');
  }

  // locator for a validation message > email-error
  error(field) {
    return this.page.getByTestId(`${field}-error`);
  }

  async fillForm({ firstName, lastName, email, subject, message }) {
    await this.firstName.fill(firstName);
    await this.lastName.fill(lastName);
    await this.email.fill(email);
    await this.subject.selectOption(subject);
    await this.message.fill(message);
  }

  async submit() {
    await this.submitButton.click();
  }

  // Submits the form and returns the API's response to POST /messages
  async submitAndWaitForApi() {
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/messages') && r.request().method() === 'POST'),
      this.submitButton.click(),
    ]);
    return response;
  }
}

module.exports = { ContactPage };