class HomePage {
  constructor(page) {
    this.page = page;
    this.productNames = page.getByTestId('product-name');
    this.searchInput = page.getByTestId('search-query');
    this.searchButton = page.getByTestId('search-submit');
  }

  async goto() {
    await this.page.goto('/');
  }

  async search(term) {
    await this.searchInput.fill(term);
    await this.searchButton.click();
  }
}

module.exports = { HomePage };