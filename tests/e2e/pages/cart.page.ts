/**
 * Page Object for MockMart Cart Page.
 *
 * Part of: Parte 9 - Page Object Model
 *
 * Encapsulates cart items, quantities, totals, and checkout navigation.
 */

import { type Page, type Locator } from '@playwright/test';

export class CartPage {
  // ── Locators ───────────────────────────────────────────────────────────
  readonly subtotal: Locator;
  readonly total: Locator;
  readonly checkoutButton: Locator;

  constructor(private page: Page) {
    this.subtotal = page.locator('[data-testid="cart-subtotal"]');
    this.total = page.locator('[data-testid="cart-total"]');
    this.checkoutButton = page.locator('[data-testid="checkout-button"]');
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/cart');
  }

  // ── Cart Item Actions ──────────────────────────────────────────────────

  cartItem(productId: number) {
    return this.page.locator(`[data-testid="cart-item-${productId}"]`);
  }

  quantity(productId: number) {
    return this.page.locator(`[data-testid="quantity-${productId}"]`);
  }

  async increase(productId: number) {
    await this.page.locator(`[data-testid="increase-${productId}"]`).click();
  }

  async decrease(productId: number) {
    await this.page.locator(`[data-testid="decrease-${productId}"]`).click();
  }

  async remove(productId: number) {
    await this.page.locator(`[data-testid="remove-${productId}"]`).click();
  }

  // ── Checkout ───────────────────────────────────────────────────────────

  async proceedToCheckout() {
    await this.checkoutButton.click();
  }
}
