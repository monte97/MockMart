/**
 * Page Object Model fixtures for MockMart E2E tests.
 *
 * Part of: Parte 9 - Page Object Model
 *
 * Provides Page Object instances as Playwright fixtures:
 *   homePage, cartPage, checkoutPage
 */

import { test as base } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';

export const test = base.extend<{
  homePage: HomePage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
}>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
});

export { expect } from '@playwright/test';
