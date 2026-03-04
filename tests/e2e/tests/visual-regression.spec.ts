/**
 * Visual Regression Tests for MockMart.
 *
 * Part of: Parte 6 - Visual Regression Testing
 *
 * Demonstrates Playwright's toHaveScreenshot() patterns:
 *   1. Basic screenshot comparison
 *   2. Masking dynamic elements
 *   3. Screenshots of specific states (with mockApi)
 *   4. Component-level screenshots
 *   5. Configuration options (threshold, animations)
 */

import { test as mockTest, expect, fakeProduct } from '../fixtures/mock-api';

// Use mockTest to have access to mockApi fixture
const test = mockTest;

// =========================================================================
// 1. Basic Screenshot Comparison
// =========================================================================

test.describe('1 - Basic Screenshot Comparison', () => {
  test('should match homepage baseline', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().waitFor();

    await expect(page).toHaveScreenshot('homepage.png');
  });

  test('should match full page screenshot', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().waitFor();

    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
    });
  });
});

// =========================================================================
// 2. Masking Dynamic Elements
// =========================================================================

test.describe('2 - Masking Dynamic Elements', () => {
  test('should mask timestamps and session IDs in cart', async ({ page }) => {
    // Add a product to cart first
    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();

    // Navigate to cart
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="cart-item"]').first().waitFor();

    await expect(page).toHaveScreenshot('cart-with-items.png', {
      mask: [
        page.locator('[data-testid="timestamp"]'),
        page.locator('[data-testid="cart-id"]'),
      ],
    });
  });

  test('should disable animations for consistent screenshots', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().waitFor();

    await expect(page).toHaveScreenshot('homepage-no-animations.png', {
      animations: 'disabled',
    });
  });
});

// =========================================================================
// 3. Screenshots of Mocked States (with mockApi)
// =========================================================================

test.describe('3 - Screenshots of Mocked States', () => {
  test('should capture error state', async ({ page, mockApi }) => {
    await mockApi.productsError(500);
    await page.goto('/');

    // Wait for error UI to render
    await page.getByText(/error|errore/i).waitFor();

    await expect(page).toHaveScreenshot('error-state.png');
  });

  test('should capture empty product list', async ({ page, mockApi }) => {
    await mockApi.emptyProducts();
    await page.goto('/');

    // Wait for empty state to render
    await page.getByText(/no products|nessun prodotto/i).waitFor();

    await expect(page).toHaveScreenshot('empty-state.png');
  });

  test('should capture loading state with delayed response', async ({ page, mockApi }) => {
    await mockApi.delay('**/api/products', 3000);
    await page.goto('/');

    // Capture while loading indicator is visible
    await page.getByText(/loading|caricamento/i).waitFor();

    await expect(page).toHaveScreenshot('loading-state.png');
  });

  test('should capture custom product layout', async ({ page, mockApi }) => {
    await mockApi.products([
      fakeProduct({ id: 1, name: 'Visual Test Product A', price: 9.99 }),
      fakeProduct({ id: 2, name: 'Visual Test Product B', price: 19.99 }),
    ]);
    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().waitFor();

    await expect(page).toHaveScreenshot('custom-products.png');
  });
});

// =========================================================================
// 4. Component-Level Screenshots
// =========================================================================

test.describe('4 - Component-Level Screenshots', () => {
  test('should match single product card', async ({ page, mockApi }) => {
    await mockApi.products([
      fakeProduct({ id: 1, name: 'Screenshot Card', price: 42.00 }),
    ]);
    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().waitFor();

    // Screenshot of a single component, not the full page
    const card = page.locator('[data-testid="product-card"]').first();
    await expect(card).toHaveScreenshot('product-card.png');
  });

  test('should match cart item component', async ({ page }) => {
    // Add a product to cart
    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();

    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="cart-item"]').first().waitFor();

    const cartItem = page.locator('[data-testid="cart-item"]').first();
    await expect(cartItem).toHaveScreenshot('cart-item.png', {
      mask: [page.locator('[data-testid="timestamp"]')],
    });
  });
});

// =========================================================================
// 5. Configuration Options
// =========================================================================

test.describe('5 - Configuration Options', () => {
  test('should pass with relaxed threshold for anti-aliasing tolerance', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().waitFor();

    await expect(page).toHaveScreenshot('homepage-tolerant.png', {
      // Allow small pixel differences from anti-aliasing
      maxDiffPixelRatio: 0.01,
      // Higher threshold = more tolerance per pixel (0-1)
      threshold: 0.3,
    });
  });

  test('should compare with strict settings for pixel-perfect UI', async ({ page, mockApi }) => {
    // Use mocked data for deterministic content
    await mockApi.products([
      fakeProduct({ id: 1, name: 'Pixel Perfect', price: 100 }),
    ]);
    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().waitFor();

    await expect(page).toHaveScreenshot('pixel-perfect.png', {
      maxDiffPixelRatio: 0,
      threshold: 0.1,
      animations: 'disabled',
    });
  });
});
