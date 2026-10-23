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

    // The message for an empty result (the test id is a best guess, the text is the fallback)
    this.noResults = page.getByTestId('no-results').or(page.getByText(/no products? found|no results/i)).first();

    // The two handles of the price slider, as recorded with codegen
    this.minPriceSlider = page.getByRole('slider', { name: 'ngx-slider', exact: true });
    this.maxPriceSlider = page.getByRole('slider', { name: 'ngx-slider-max' });
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

  // The card of one product, found by its EXACT name: "Pliers" must not match "Combination Pliers".
  // A regular expression anchored at both ends says "exactly this text" (the replace() escapes
  // characters that have a special meaning in a regular expression).
  productByName(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.productNames.filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) }).first();
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

    // How many category checkboxes are ticked (ticking a parent category ticks its sub-categories too)
  checkedCategoryCount() {
    return this.categoryFilters.evaluateAll((elements) => elements.filter((element) => element.checked).length);
  }

  // True when a pagination control is hidden or switched off (by attribute or by a "disabled" style)
  async isDisabled(control) {
    if (!(await control.count()) || !(await control.first().isVisible())) return true;
    return control.first().evaluate((element) => {
      const holder = element.closest('li');
      return (
        element.hasAttribute('disabled') ||
        element.getAttribute('aria-disabled') === 'true' ||
        element.classList.contains('disabled') ||
        Boolean(holder && holder.classList.contains('disabled'))
      );
    });
  }
}

module.exports = { HomePage };