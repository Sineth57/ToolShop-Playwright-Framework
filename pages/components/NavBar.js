class NavBar {
  constructor(page) {
    this.page = page;
    this.home = page.getByTestId('nav-home');
    this.contact = page.getByTestId('nav-contact');
    this.signIn = page.getByTestId('nav-sign-in');
    this.categories = page.getByTestId('nav-categories');
    this.cart = page.getByTestId('nav-cart');
  }

  async openCategory(categoryTestId) {
    await this.categories.click();
    await this.page.getByTestId(categoryTestId).click();
  }
}

module.exports = { NavBar };