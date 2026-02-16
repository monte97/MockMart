/**
 * Visual Regression Tests for Checkout States.
 *
 * Part of: Parte 3 - Screenshot Testing su Stati Complessi
 *
 * Captures and compares screenshots of key checkout states:
 * - Empty cart
 * - Cart with products
 * - Checkout in progress
 * - Order confirmation
 * - Payment error
 */

import { test, expect } from '../fixtures/trace-collector';

test.describe('Visual: Checkout States', () => {
  test('empty cart state', async ({ page }) => {
    await page.goto('/cart');

    // Mask dynamic elements (timestamps, session IDs)
    await expect(page).toHaveScreenshot('cart-empty.png', {
      mask: [page.locator('[data-testid="timestamp"]')],
    });
  });

  test('cart with products', async ({ page }) => {
    // TODO: Add products to cart first
    await page.goto('/');

    // Add a product
    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();

    // Go to cart
    await page.goto('/cart');

    await expect(page).toHaveScreenshot('cart-with-products.png', {
      mask: [
        page.locator('[data-testid="timestamp"]'),
        page.locator('[data-testid="cart-id"]'),
      ],
    });
  });

  test('checkout in progress', async ({ page }) => {
    // TODO: Setup cart and start checkout
    // Capture loading/spinner state

    await expect(page).toHaveScreenshot('checkout-loading.png');
  });

  test('order confirmation', async ({ page }) => {
    // TODO: Complete checkout and capture confirmation

    await expect(page).toHaveScreenshot('order-confirmation.png', {
      mask: [
        page.locator('[data-testid="order-id"]'),
        page.locator('[data-testid="order-date"]'),
      ],
    });
  });

  test('payment error state', async ({ page, traceCollector }) => {
    // TODO: Trigger payment failure and capture error UI

    // On failure, we also have trace correlation!
    // traceCollector.printSummary() will show what happened in backend

    await expect(page).toHaveScreenshot('payment-error.png');
  });
});
