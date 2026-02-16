/**
 * Authentication fixtures for MockMart E2E tests.
 * Handles Keycloak login and storageState management.
 *
 * Part of: Parte 1 - Testare un E-commerce a Microservizi
 */

import { test as base, expect } from '@playwright/test';

// Test users from MockMart
export const USERS = {
  mario: {
    username: 'mario',
    password: 'mario123',
    role: 'user',
  },
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
  },
  blocked: {
    username: 'blocked',
    password: 'blocked123',
    role: 'user',
    canCheckout: false,
  },
} as const;

export type UserKey = keyof typeof USERS;

/**
 * Extended test fixture with authenticated user.
 */
export const test = base.extend<{ userKey: UserKey }>({
  userKey: ['mario', { option: true }],
});

/**
 * Login to MockMart via Keycloak.
 * Used in setup to create storageState.
 */
export async function loginAs(page: any, userKey: UserKey) {
  const user = USERS[userKey];

  // TODO: Implement Keycloak login flow
  // 1. Go to app
  // 2. Click login
  // 3. Fill Keycloak form
  // 4. Handle redirect back

  await page.goto('/');
  // ... login implementation
}

export { expect };
