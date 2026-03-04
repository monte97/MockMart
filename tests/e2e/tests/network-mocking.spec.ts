/**
 * Network Mocking & API Interception Tests for MockMart.
 *
 * Part of: Parte 4 - Network Mocking e API Interception
 *
 * Demonstrates Playwright's page.route() capabilities on a real
 * microservices e-commerce app:
 *
 *   1. Basic Response Mocking — replace API responses with custom data
 *   2. Error Simulation — simulate server errors and payment failures
 *   3. Loading State Testing — add delays to verify loading indicators
 *   4. Conditional Mocking — passthrough + modify real responses
 *   5. Request Abort — simulate offline / network failures
 *
 * NOTE: page.route() intercepts browser <-> server traffic only.
 * Server-side calls (e.g. shop-api -> payment-service) are NOT
 * interceptable from the browser context.
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal product matching MockMart's /api/products schema. */
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  description: string;
}

/** Factory for fake products used across multiple test groups. */
function fakeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 900,
    name: 'Mocked Widget',
    category: 'gadgets',
    price: 29.99,
    stock: 42,
    image: '/images/placeholder.png',
    description: 'A completely fake product injected by page.route().',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Basic Response Mocking
// ═══════════════════════════════════════════════════════════════════════════

test.describe('1 - Basic Response Mocking', () => {
  test('should render a custom product list from mocked API', async ({ page }) => {
    const products: Product[] = [
      fakeProduct({ id: 1, name: 'Alpha', price: 10 }),
      fakeProduct({ id: 2, name: 'Beta', price: 20 }),
      fakeProduct({ id: 3, name: 'Gamma', price: 30 }),
    ];

    await page.route('**/api/products', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(products),
      }),
    );

    await page.goto('/');

    // The UI should show exactly 3 product cards
    const cards = page.locator('[data-testid="product-card"]');
    await expect(cards).toHaveCount(3);

    // Verify first product name is visible
    await expect(cards.first()).toContainText('Alpha');
  });

  test('should show empty state when product list is empty', async ({ page }) => {
    await page.route('**/api/products', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    );

    await page.goto('/');

    // No product cards should be visible
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);

    // The app should render some kind of empty-state indicator
    // (exact selector depends on MockMart's frontend implementation)
    await expect(page.getByText(/no products|nessun prodotto/i)).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Error Simulation
// ═══════════════════════════════════════════════════════════════════════════

test.describe('2 - Error Simulation', () => {
  test('should display error UI when products API returns 500', async ({ page }) => {
    await page.route('**/api/products', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      }),
    );

    await page.goto('/');

    // The page should show an error message instead of products
    await expect(page.getByText(/error|errore|something went wrong/i)).toBeVisible();
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);
  });

  test('should show payment error when checkout returns 402', async ({ page }) => {
    // Let the products API work normally so the user can add items to cart.
    // We only intercept the checkout endpoint.
    await page.route('**/api/checkout', (route) =>
      route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'payment_declined',
          message: 'Your card was declined. Please try a different payment method.',
        }),
      }),
    );

    await page.goto('/');

    // Add a product to cart
    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();

    // Navigate to cart and start checkout
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();
    await page.locator('[data-testid="confirm-order"]').click();

    // The mocked 402 should surface a payment error in the UI
    await expect(page.getByText(/declined|pagamento rifiutato/i)).toBeVisible();

    // Order confirmation should NOT appear
    await expect(page.locator('[data-testid="order-confirmation"]')).not.toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Loading State Testing
// ═══════════════════════════════════════════════════════════════════════════

test.describe('3 - Loading State Testing', () => {
  test('should show loading indicator while products API is slow', async ({ page }) => {
    // Intercept the products endpoint and delay the response by 3 seconds
    await page.route('**/api/products', async (route) => {
      // Wait 3 s before fulfilling — enough time to assert on the loading state
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          fakeProduct({ id: 1, name: 'Delayed Product' }),
        ]),
      });
    });

    await page.goto('/');

    // While the API is still pending, a loading indicator should be visible.
    // Common patterns: spinner, skeleton, "Loading..." text.
    await expect(page.getByText(/loading|caricamento/i)).toBeVisible();

    // After the delay, the product should appear and loading should vanish
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(1, {
      timeout: 5_000,
    });
    await expect(page.getByText(/loading|caricamento/i)).not.toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Conditional Mocking (Passthrough + Modify)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('4 - Conditional Mocking (Passthrough + Modify)', () => {
  test('should fetch real products and override all prices to 0', async ({ page }) => {
    await page.route('**/api/products', async (route) => {
      // Forward the request to the real server
      const response = await route.fetch();
      const products: Product[] = await response.json();

      // Modify every product's price to 0
      const modified = products.map((p) => ({ ...p, price: 0 }));

      await route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: JSON.stringify(modified),
      });
    });

    await page.goto('/');

    // All visible prices should read 0 (or "free" / "0.00" depending on formatting)
    const cards = page.locator('[data-testid="product-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      // Price text should contain "0" (e.g. "$0.00", "0,00", "EUR 0.00")
      await expect(cards.nth(i)).toContainText(/\b0[.,]00\b/);
    }
  });

  test('should mock only requests with category param, pass others through', async ({ page }) => {
    await page.route('**/api/products**', async (route) => {
      const url = new URL(route.request().url());

      if (url.searchParams.get('category') === 'gadgets') {
        // Return a curated list for the "gadgets" category
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            fakeProduct({ id: 777, name: 'Mocked Gadget', category: 'gadgets' }),
          ]),
        });
      } else {
        // Everything else goes to the real server untouched
        await route.continue();
      }
    });

    await page.goto('/');

    // The main product listing (no category filter) comes from the real API.
    // We can't assert exact content (depends on live data), but at least
    // verify the page loaded products.
    const cards = page.locator('[data-testid="product-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 5_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Request Abort (Offline Simulation)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('5 - Request Abort (Offline Simulation)', () => {
  test('should show error/offline state when all API calls are aborted', async ({ page }) => {
    // Step 1 — Load the page normally so the app bootstraps with real data
    await page.goto('/');
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({
      timeout: 5_000,
    });

    // Step 2 — Install an abort handler for every /api/* request
    await page.route('**/api/**', (route) => route.abort('connectionrefused'));

    // Step 3 — Reload: the app will try to fetch products again, but all
    // requests are aborted, simulating a complete network failure
    await page.reload();

    // The page should show an error or offline indicator
    await expect(
      page.getByText(/error|offline|network|connessione|errore/i),
    ).toBeVisible();

    // Product cards should no longer be rendered
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);
  });
});
