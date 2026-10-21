const { NavBar } = require('./components/NavBar');

class HomePage {
  constructor(page) {
    this.page = page;
    this.nav = new NavBar(page);
    this.productNames = page.getByTestId('product-name');
    this.searchInput = page.getByTestId('search-query');
    this.searchButton = page.getByTestId('search-submit');
    this.searchReset = page.getByTestId('search-reset');
    this.sortSelect = page.getByTestId('sort');
    this.brandFilters = page.getByTestId(/^brand-/);
    this.categoryFilters = page.getByTestId(/^category-/);
    this.ecoFilter = page.getByTestId('eco-friendly-filter');
    this.nextPage = page.getByTestId('pagination-next');
    this.previousPage = page.getByTestId('pagination-prev');
  }

  async goto() {
    await this.page.goto('/');
  }

  async search(term) {
    await this.searchInput.fill(term);
    await this.searchButton.click();
  }

  async sortBy(value) {
    await this.sortSelect.selectOption(value);
  }

  async goToNextPage() {
    await this.nextPage.click();
  }

  async goToPreviousPage() {
    await this.previousPage.click();
  }

  async names() {
    const texts = await this.productNames.allInnerTexts();
    return texts.map((text) => text.trim());
  }

  brandFilter(id) {
    return this.page.getByTestId(`brand-${id}`);
  }

  categoryFilter(id) {
    return this.page.getByTestId(`category-${id}`);
  }

  // The ids of every category checkbox on the page
  categoryIds() {
    return this.categoryFilters.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-test').replace('category-', '')),
    );
  }
}

module.exports = { HomePage };