import { Page, Locator } from '@playwright/test';

/**
 * All-products listing at /dk/store.
 *
 * Every product in the sandbox costs the same (€10.00), so the price sort has
 * no tiebreaker — see the sort specs.
 */
export class StorePage {
  readonly page: Page;
  readonly title: Locator;
  readonly productList: Locator;
  readonly productCards: Locator;
  readonly productTitles: Locator;
  readonly productPrices: Locator;
  readonly sortOptions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByTestId('store-page-title');
    this.productList = page.getByTestId('products-list');
    this.productCards = page.getByTestId('product-wrapper');
    this.productTitles = page.getByTestId('product-title');
    this.productPrices = page.getByTestId('price');
    this.sortOptions = page.getByTestId('radio-label');
  }

  async goto() {
    await this.page.goto('/dk/store');
  }

  /**
   * Waits until at least one card is painted. The list is server-rendered, so this
   * means "HTML arrived", not "the page reacts to clicks".
   */
  async waitForLoaded() {
    await this.productCards.first().waitFor({ state: 'visible' });
  }

  /** Product names in the order they are currently rendered (single read, no waiting). */
  async productNames(): Promise<string[]> {
    return this.productTitles.allTextContents();
  }

  /** Product prices as numbers, in rendered order (single read, no waiting). */
  async productPriceValues(): Promise<number[]> {
    const prices = await this.productPrices.allTextContents();
    return prices.map((price) => Number(price.replace(/[^\d.]/g, '')));
  }

  /**
   * Clicks a sort option by its visible label and waits for the result of the
   * click — the URL changing to the new `?sortBy=` — instead of returning while
   * the re-sorted list is still in flight. A click that never takes effect
   * fails here with a navigation timeout rather than on a stale list later.
   * Expects the option to change the URL: choosing the already active option
   * would wait until the test timeout.
   */
  async sortBy(label: string) {
    const before = this.page.url();
    await this.sortOptions.filter({ hasText: label }).first().click();
    await this.page.waitForURL((url) => url.href !== before);
  }
}
