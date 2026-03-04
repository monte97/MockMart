/**
 * Reusable mock API fixture for MockMart E2E tests.
 *
 * Part of: Parte 5 - Scalare il Network Mocking
 *
 * Provides an ergonomic API to mock MockMart endpoints:
 *   mockApi.products([...])     - mock GET /api/products
 *   mockApi.emptyProducts()     - mock GET /api/products with []
 *   mockApi.productsError(500)  - mock GET /api/products with error
 *   mockApi.checkoutSuccess()   - mock POST /api/checkout with success
 *   mockApi.checkoutError(402)  - mock POST /api/checkout with error
 *   mockApi.delay(url, ms)      - add delay to any endpoint
 */

import { test as base, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  description: string;
}

function fakeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 900,
    name: 'Mocked Widget',
    category: 'gadgets',
    price: 29.99,
    stock: 42,
    image: '/images/placeholder.png',
    description: 'A fake product from mock-api fixture.',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MockApi class
// ---------------------------------------------------------------------------

class MockApi {
  constructor(private page: Page) {}

  async products(items: Product[]) {
    await this.page.route('**/api/products', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(items),
      }),
    );
  }

  async emptyProducts() {
    await this.products([]);
  }

  async productsError(status: number = 500) {
    await this.page.route('**/api/products', (route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: `Mocked error ${status}` }),
      }),
    );
  }

  async checkoutSuccess(orderId: number = 1) {
    await this.page.route('**/api/checkout', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          order: {
            id: orderId,
            status: 'pending',
            total: 99.99,
            createdAt: new Date().toISOString(),
          },
        }),
      }),
    );
  }

  async checkoutError(status: number = 402) {
    const errors: Record<number, string> = {
      400: 'Cart is empty',
      402: 'Payment declined',
      403: 'Not authorized to checkout',
      500: 'Internal server error',
    };

    await this.page.route('**/api/checkout', (route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          error: errors[status] || `Error ${status}`,
          details: `Mocked ${status} from mock-api fixture`,
        }),
      }),
    );
  }

  async delay(urlPattern: string, ms: number) {
    await this.page.route(urlPattern, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      await route.continue();
    });
  }
}

// ---------------------------------------------------------------------------
// Fixture export
// ---------------------------------------------------------------------------

export { fakeProduct, type Product };

export const test = base.extend<{ mockApi: MockApi }>({
  mockApi: async ({ page }, use) => {
    const api = new MockApi(page);
    await use(api);
  },
});

export { expect } from '@playwright/test';
