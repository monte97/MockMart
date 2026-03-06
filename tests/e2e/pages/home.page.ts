/**
 * Page Object for MockMart Home Page.
 *
 * Part of: Parte 9 - Page Object Model
 *
 * Encapsulates product listing, search, filters, and add-to-cart actions.
 */

import { type Page, type Locator } from '@playwright/test';

export class HomePage {
  // ── Locators ───────────────────────────────────────────────────────────
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly sortFilter: Locator;

  constructor(private page: Page) {
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.categoryFilter = page.locator('[data-testid="category-filter"]');
    this.sortFilter = page.locator('[data-testid="sort-filter"]');
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/');
  }

  // ── Product Actions ────────────────────────────────────────────────────

  productCard(id: number) {
    return this.page.locator(`[data-testid="product-${id}"]`);
  }

  /** Get all visible product cards (use .count() or .nth()). */
  get productCards() {
    return this.page.locator('[class="product-card"]');
  }

  addToCartButton(id: number) {
    return this.page.locator(`[data-testid="add-to-cart-${id}"]`);
  }

  async addToCart(productId: number) {
    await this.addToCartButton(productId).click();
  }

  // ── Search & Filters ──────────────────────────────────────────────────

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async filterByCategory(category: string) {
    await this.categoryFilter.selectOption(category);
  }

  async sortBy(option: string) {
    await this.sortFilter.selectOption(option);
  }
}
