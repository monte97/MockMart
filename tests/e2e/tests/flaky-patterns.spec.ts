/**
 * Flaky vs Stable Test Patterns for MockMart.
 *
 * Part of: Parte 7 - Diagnosticare e Risolvere Test Flaky
 *
 * Each section shows a FLAKY pattern (commented out or marked) and
 * its STABLE equivalent. The flaky versions demonstrate common mistakes;
 * the stable versions show the fix.
 *
 *   1. Timing: sleep vs waitFor
 *   2. Race condition: click before ready vs explicit wait
 *   3. External dependency: real API vs mock
 *   4. Selector fragility: nth-child vs data-testid
 *   5. Retry configuration examples
 */

import { test as mockTest, expect, fakeProduct } from '../fixtures/mock-api';

const test = mockTest;

// =========================================================================
// 1. Timing: sleep vs waitFor
// =========================================================================

test.describe('1 - Timing', () => {
  // FLAKY: hard-coded wait — passes only if API responds within 2 seconds
  test.skip('FLAKY: uses fixed timeout', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000); // Arbitrary wait
    const count = await page.locator('[data-testid="product-card"]').count();
    expect(count).toBeGreaterThan(0);
  });

  // STABLE: explicit waitFor — waits only as long as needed
  test('STABLE: waits for element', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().waitFor();
    const count = await page.locator('[data-testid="product-card"]').count();
    expect(count).toBeGreaterThan(0);
  });
});

// =========================================================================
// 2. Race Condition: click before ready
// =========================================================================

test.describe('2 - Race Condition', () => {
  // FLAKY: clicks immediately after goto — button might not be interactive yet
  test.skip('FLAKY: clicks without waiting for hydration', async ({ page }) => {
    await page.goto('/');
    // The product card might be in the DOM but the click handler not attached yet
    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();
    // This might fail if the click didn't register
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
  });

  // STABLE: wait for the element to be actionable, then verify the result
  test('STABLE: waits for element and verifies action result', async ({ page }) => {
    await page.goto('/');
    // waitFor ensures the element is attached and visible
    await page.locator('[data-testid="product-card"]').first().waitFor();
    await page.locator('[data-testid="product-card"]').first().click();

    // Wait for the detail/add-to-cart to be ready
    await page.locator('[data-testid="add-to-cart"]').waitFor();
    await page.locator('[data-testid="add-to-cart"]').click();

    // Use waitForResponse to sync with the API call
    await page.locator('[data-testid="cart-icon"]').click();
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
  });
});

// =========================================================================
// 3. External Dependency: real API vs mock
// =========================================================================

test.describe('3 - External Dependency', () => {
  // FLAKY: depends on real backend — fails if service is slow or down
  test.skip('FLAKY: depends on real checkout service', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();
    await page.locator('[data-testid="confirm-order"]').click();
    // Fails intermittently when payment-service is slow
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  });

  // STABLE: mock the checkout response — deterministic, fast
  test('STABLE: mocks checkout for deterministic result', async ({ page, mockApi }) => {
    await mockApi.checkoutSuccess(99);

    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().waitFor();
    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();
    await page.locator('[data-testid="confirm-order"]').click();

    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  });
});

// =========================================================================
// 4. Selector Fragility
// =========================================================================

test.describe('4 - Selector Fragility', () => {
  // FLAKY: positional selector — breaks when product order changes
  test.skip('FLAKY: relies on DOM position', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    // nth-child depends on product order in the database
    const thirdProduct = page.locator('.product-grid > div:nth-child(3)');
    await expect(thirdProduct).toContainText('Keyboard');
  });

  // STABLE: semantic selector — resilient to layout changes
  test('STABLE: uses data-testid and text matching', async ({ page, mockApi }) => {
    await mockApi.products([
      fakeProduct({ id: 1, name: 'Laptop ProBook' }),
      fakeProduct({ id: 2, name: 'Wireless Mouse' }),
      fakeProduct({ id: 3, name: 'Mechanical Keyboard' }),
    ]);

    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().waitFor();

    // Find by content, not by position
    await expect(page.getByText('Mechanical Keyboard')).toBeVisible();
  });
});

// =========================================================================
// 5. Retry Configuration
// =========================================================================

// This section demonstrates retry config patterns (not flaky vs stable)

test.describe('5 - Retry Patterns', () => {
  // Use repeat-each locally to reproduce flakiness:
  // npx playwright test flaky-patterns --repeat-each=10

  test('should pass consistently with mocked data', async ({ page, mockApi }) => {
    await mockApi.products([
      fakeProduct({ id: 1, name: 'Stable Product' }),
    ]);

    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().waitFor();
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(1);
  });
});

// For critical tests, disable retries to catch real bugs:
test.describe('Critical path - no retries', () => {
  test.describe.configure({ retries: 0 });

  test('homepage loads products (must never be flaky)', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().waitFor();
    const count = await page.locator('[data-testid="product-card"]').count();
    expect(count).toBeGreaterThan(0);
  });
});
