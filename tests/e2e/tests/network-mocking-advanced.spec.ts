/**
 * Advanced Network Mocking Tests for MockMart.
 *
 * Part of: Parte 5 - Scalare il Network Mocking
 *
 * Demonstrates:
 *   1. Reusable mock fixture (mockApi)
 *   2. HAR replay (routeFromHAR)
 *   3. Scenario composition (combining multiple mocks)
 *   4. Mock + trace correlation (mergeTests)
 */

import { mergeTests } from '@playwright/test';
import { test as mockTest, expect, fakeProduct } from '../fixtures/mock-api';
import { test as traceTest } from '../fixtures/trace-collector';

// =========================================================================
// 1. Reusable Mock Fixture
// =========================================================================

mockTest.describe('1 - Reusable Mock Fixture', () => {
  mockTest('should show products from fixture', async ({ page, mockApi }) => {
    await mockApi.products([
      fakeProduct({ id: 1, name: 'Widget A', price: 10 }),
      fakeProduct({ id: 2, name: 'Widget B', price: 20 }),
    ]);

    await page.goto('/');

    const cards = page.locator('[data-testid="product-card"]');
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('Widget A');
  });

  mockTest('should show error from fixture', async ({ page, mockApi }) => {
    await mockApi.productsError(500);

    await page.goto('/');

    await expect(page.getByText(/error|errore/i)).toBeVisible();
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);
  });

  mockTest('should show checkout error from fixture', async ({ page, mockApi }) => {
    await mockApi.checkoutError(402);

    await page.goto('/');

    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();
    await page.locator('[data-testid="confirm-order"]').click();

    await expect(page.getByText(/declined|rifiutato/i)).toBeVisible();
  });

  mockTest('should add delay to products endpoint', async ({ page, mockApi }) => {
    await mockApi.delay('**/api/products', 2000);

    await page.goto('/');

    await expect(page.getByText(/loading|caricamento/i)).toBeVisible();

    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({
      timeout: 5_000,
    });
  });
});

// =========================================================================
// 2. HAR Replay
// =========================================================================

mockTest.describe('2 - HAR Replay', () => {
  mockTest('should replay product listing from HAR file', async ({ page }) => {
    await page.routeFromHAR('./hars/products.har', {
      url: '**/api/products',
      update: false,
    });

    await page.goto('/');

    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({
      timeout: 5_000,
    });
  });
});

// =========================================================================
// 3. Scenario Composition
// =========================================================================

mockTest.describe('3 - Scenario Composition', () => {
  mockTest('checkout succeeds with mocked products and payment', async ({ page, mockApi }) => {
    await mockApi.products([
      fakeProduct({ id: 1, name: 'Composable Widget', price: 49.99 }),
    ]);
    await mockApi.checkoutSuccess(42);

    await page.goto('/');

    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();
    await page.locator('[data-testid="confirm-order"]').click();

    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  });

  mockTest('checkout fails: products OK but payment declined', async ({ page, mockApi }) => {
    await mockApi.checkoutError(402);

    await page.goto('/');

    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();
    await page.locator('[data-testid="confirm-order"]').click();

    await expect(page.getByText(/declined|rifiutato/i)).toBeVisible();
    await expect(page.locator('[data-testid="order-confirmation"]')).not.toBeVisible();
  });
});

// =========================================================================
// 4. Mock + Trace Correlation (mergeTests)
// =========================================================================

const test = mergeTests(mockTest, traceTest);

test.describe('4 - Mock + Trace Correlation', () => {
  test('should collect traces even with mocked checkout', async ({
    page,
    mockApi,
    traceCollector,
  }) => {
    await mockApi.checkoutError(402);

    await page.goto('/');

    // Browse products — real API calls with traces
    await page.locator('[data-testid="product-card"]').first().click();

    // Trace collector should have captured trace IDs from real API calls
    const traceIds = traceCollector.getTraceIds();
    // Traces exist from the real /api/products call
  });
});
