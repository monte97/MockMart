/**
 * Authentication Testing for MockMart.
 *
 * Part of: Parte 8 - Authentication Testing
 *
 * Demonstrates:
 *   1. storageState — login reused across tests (no re-login)
 *   2. Role-based access — mario vs admin vs blocked
 *   3. Checkout authorization — canCheckout custom claim
 *   4. Session and token management — expiry, logout
 *   5. Auth + mock composition — mergeTests with mockApi
 */

import { mergeTests } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { test as mockTest } from '../fixtures/mock-api';
import { fakeProduct } from '../fixtures/mock-api';

// ═══════════════════════════════════════════════════════════════════════════
// 1. storageState — Authenticated Without Login
// ═══════════════════════════════════════════════════════════════════════════

base.describe('1 - storageState Reuse', () => {
  base('should be already authenticated via storageState', async ({ page }) => {
    await page.goto('/');

    // The Logout button proves we're authenticated — no login was needed
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  base('should access orders page without login', async ({ page }) => {
    await page.goto('/orders');

    // Page loads directly — storageState includes the Keycloak token
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByText(/ordini/i)).toBeVisible();
  });

  base('should include Authorization header in API calls', async ({ page }) => {
    // Intercept an authenticated API call to verify the token is sent
    const requestPromise = page.waitForRequest('**/api/orders');

    await page.goto('/orders');

    const request = await requestPromise;
    const authHeader = request.headers()['authorization'];
    expect(authHeader).toBeDefined();
    expect(authHeader).toMatch(/^Bearer /);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Role-Based Access
// ═══════════════════════════════════════════════════════════════════════════

base.describe('2 - Role-Based Access', () => {
  base('mario should NOT see the Admin link', async ({ page }) => {
    // This test runs in the default "chromium" project (mario)
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin' })).not.toBeVisible();
  });

  base('mario should see the Orders link', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Ordini' })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Checkout Authorization (canCheckout claim)
// ═══════════════════════════════════════════════════════════════════════════

base.describe('3 - Checkout Authorization', () => {
  base('mario (canCheckout=true) should complete checkout', async ({ page }) => {
    await page.goto('/');

    // Add product to cart
    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();

    // Go to cart and checkout
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();
    await page.locator('[data-testid="confirm-order"]').click();

    // Checkout should succeed for mario
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Session Management
// ═══════════════════════════════════════════════════════════════════════════

base.describe('4 - Session Management', () => {
  base('logout should redirect to homepage without auth', async ({ page }) => {
    await page.goto('/');

    // Verify we're logged in
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

    // Click logout
    await page.getByRole('button', { name: 'Logout' }).click();

    // Should redirect to homepage, Login link should appear
    await page.waitForURL('http://localhost/');
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible({
      timeout: 10_000,
    });
  });

  base('expired token should trigger re-authentication', async ({ page }) => {
    // Intercept token refresh to simulate expiry
    await page.route('**/auth/realms/techstore/protocol/openid-connect/token', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Token expired' }),
      }),
    );

    await page.goto('/');

    // The app should detect the expired token and redirect to login
    // (keycloak-js calls kc.login() on refresh failure)
    // Wait for either the login page or the Keycloak redirect
    await page.waitForURL(/\/auth\/realms\/techstore\/|\/login/, { timeout: 15_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Auth + Mock Composition
// ═══════════════════════════════════════════════════════════════════════════

// Merge auth (from storageState) with mockApi fixture
const test = mergeTests(base, mockTest);

test.describe('5 - Auth + Mock Composition', () => {
  test('authenticated user with mocked products', async ({ page, mockApi }) => {
    await mockApi.products([
      fakeProduct({ id: 1, name: 'Auth Widget', price: 99.99 }),
    ]);

    await page.goto('/');

    // Authenticated (storageState) + mocked products (mockApi)
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    await expect(page.getByText('Auth Widget')).toBeVisible();
  });

  test('authenticated checkout with mocked payment error', async ({ page, mockApi }) => {
    await mockApi.checkoutError(402);

    await page.goto('/');

    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();
    await page.locator('[data-testid="confirm-order"]').click();

    // Authenticated but payment declined
    await expect(page.getByText(/declined|rifiutato/i)).toBeVisible();
  });
});
