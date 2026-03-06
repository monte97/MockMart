/**
 * Page Object for MockMart Checkout Page.
 *
 * Part of: Parte 9 - Page Object Model
 *
 * Encapsulates shipping form, payment selection, and order placement.
 */

import { type Page, type Locator } from '@playwright/test';

interface ShippingInfo {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
}

export class CheckoutPage {
  // ── Locators ───────────────────────────────────────────────────────────
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly address: Locator;
  readonly city: Locator;
  readonly zipCode: Locator;
  readonly phone: Locator;
  readonly orderTotal: Locator;
  readonly placeOrderButton: Locator;
  readonly orderNumber: Locator;

  constructor(private page: Page) {
    this.firstName = page.locator('[data-testid="first-name"]');
    this.lastName = page.locator('[data-testid="last-name"]');
    this.address = page.locator('[data-testid="address"]');
    this.city = page.locator('[data-testid="city"]');
    this.zipCode = page.locator('[data-testid="zip-code"]');
    this.phone = page.locator('[data-testid="phone"]');
    this.orderTotal = page.locator('[data-testid="order-total"]');
    this.placeOrderButton = page.locator('[data-testid="place-order-button"]');
    this.orderNumber = page.locator('[data-testid="order-number"]');
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/checkout');
  }

  // ── Shipping Form ──────────────────────────────────────────────────────

  async fillShipping(info: ShippingInfo) {
    await this.firstName.fill(info.firstName);
    await this.lastName.fill(info.lastName);
    await this.address.fill(info.address);
    await this.city.fill(info.city);
    await this.zipCode.fill(info.zipCode);
    await this.phone.fill(info.phone);
  }

  // ── Payment ────────────────────────────────────────────────────────────

  async selectCreditCard() {
    await this.page.locator('[data-testid="payment-credit-card"]').click();
  }

  async selectPayPal() {
    await this.page.locator('[data-testid="payment-paypal"]').click();
  }

  async selectBankTransfer() {
    await this.page.locator('[data-testid="payment-bank-transfer"]').click();
  }

  // ── Order ──────────────────────────────────────────────────────────────

  async placeOrder() {
    await this.placeOrderButton.click();
  }

  /** Complete checkout with default shipping data and credit card. */
  async completeWithDefaults() {
    await this.fillShipping({
      firstName: 'Mario',
      lastName: 'Rossi',
      address: 'Via Roma 1',
      city: 'Bologna',
      zipCode: '40100',
      phone: '+39 051 1234567',
    });
    await this.selectCreditCard();
    await this.placeOrder();
  }
}
