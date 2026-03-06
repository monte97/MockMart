/**
 * Page Object Model Checkout Tests for MockMart.
 *
 * Part of: Parte 9 - Page Object Model
 *
 * Demonstrates:
 *   1. POM basics — navigate, interact, assert via Page Objects
 *   2. Full checkout flow — home → cart → checkout → confirmation
 *   3. POM + mockApi composition — mergeTests for controlled scenarios
 */

import { mergeTests } from '@playwright/test';
import { test as pomTest, expect } from '../fixtures/pages';
import { test as mockTest, fakeProduct } from '../fixtures/mock-api';

// ═══════════════════════════════════════════════════════════════════════════
// 1. POM Basics
// ═══════════════════════════════════════════════════════════════════════════

pomTest.describe('1 - POM Basics', () => {
  pomTest('should navigate and search products', async ({ homePage }) => {
    await homePage.goto();
    await homePage.search('widget');

    // Search input should contain the query
    await expect(homePage.searchInput).toHaveValue('widget');
  });

  pomTest('should filter by category', async ({ homePage }) => {
    await homePage.goto();
    await homePage.filterByCategory('gadgets');

    await expect(homePage.categoryFilter).toHaveValue('gadgets');
  });

  pomTest('should navigate to cart', async ({ cartPage }) => {
    await cartPage.goto();

    await expect(cartPage.checkoutButton).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Full Checkout Flow with POM
// ═══════════════════════════════════════════════════════════════════════════

pomTest.describe('2 - Full Checkout Flow', () => {
  pomTest('complete purchase: home → cart → checkout → confirmation', async ({
    page,
    homePage,
    cartPage,
    checkoutPage,
  }) => {
    // Step 1: Browse products and add to cart
    await homePage.goto();
    await homePage.productCards.first().waitFor();

    // Click the first product's add-to-cart (need product ID from the DOM)
    const firstCard = homePage.productCards.first();
    await firstCard.locator('button').click();

    // Step 2: Go to cart and proceed
    await cartPage.goto();
    await expect(cartPage.total).toBeVisible();
    await cartPage.proceedToCheckout();

    // Step 3: Fill checkout form and place order
    await checkoutPage.fillShipping({
      firstName: 'Mario',
      lastName: 'Rossi',
      address: 'Via Roma 1',
      city: 'Bologna',
      zipCode: '40100',
      phone: '+39 051 1234567',
    });
    await checkoutPage.selectCreditCard();
    await checkoutPage.placeOrder();

    // Step 4: Verify order confirmation
    await expect(checkoutPage.orderNumber).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. POM + MockApi Composition
// ═══════════════════════════════════════════════════════════════════════════

const test = mergeTests(pomTest, mockTest);

test.describe('3 - POM + MockApi', () => {
  test('checkout with mocked products and payment', async ({
    homePage,
    cartPage,
    checkoutPage,
    mockApi,
  }) => {
    // Mock: custom products + successful checkout
    await mockApi.products([
      fakeProduct({ id: 1, name: 'POM Widget', price: 49.99 }),
    ]);
    await mockApi.checkoutSuccess(42);

    // Navigate and add product
    await homePage.goto();
    await homePage.addToCart(1);

    // Cart and checkout
    await cartPage.goto();
    await cartPage.proceedToCheckout();
    await checkoutPage.completeWithDefaults();

    // Order confirmation
    await expect(checkoutPage.orderNumber).toBeVisible({ timeout: 10_000 });
  });

  test('checkout with mocked payment error', async ({
    homePage,
    cartPage,
    checkoutPage,
    mockApi,
    page,
  }) => {
    await mockApi.products([
      fakeProduct({ id: 1, name: 'Error Widget', price: 99.99 }),
    ]);
    await mockApi.checkoutError(402);

    await homePage.goto();
    await homePage.addToCart(1);

    await cartPage.goto();
    await cartPage.proceedToCheckout();
    await checkoutPage.completeWithDefaults();

    // Payment declined
    await expect(page.getByText(/declined|rifiutato/i)).toBeVisible();
    await expect(checkoutPage.orderNumber).not.toBeVisible();
  });
});
