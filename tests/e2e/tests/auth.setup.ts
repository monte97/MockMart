/**
 * Authentication Setup for MockMart E2E Tests.
 *
 * Part of: Parte 8 - Authentication Testing
 *
 * Performs real Keycloak login for each test user and saves
 * storageState to .auth/<user>.json. Other projects depend
 * on this setup and inherit the saved state.
 *
 * Run first via: dependencies: ['setup'] in playwright.config.ts
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

// ─── Test Users ──────────────────────────────────────────────────────────────

interface TestUser {
  username: string;
  email: string;
  password: string;
}

const USERS: Record<string, TestUser> = {
  mario: {
    username: 'mario',
    email: 'mario.rossi@example.com',
    password: 'mario123',
  },
  admin: {
    username: 'admin',
    email: 'admin@techstore.com',
    password: 'admin123',
  },
  blocked: {
    username: 'blocked',
    email: 'blocked@example.com',
    password: 'blocked123',
  },
};

// ─── Storage State Paths ─────────────────────────────────────────────────────

export const AUTH_DIR = path.join(__dirname, '../.auth');

export function storageStatePath(userKey: string): string {
  return path.join(AUTH_DIR, `${userKey}.json`);
}

// ─── Keycloak Login Helper ───────────────────────────────────────────────────

async function keycloakLogin(page: any, user: TestUser): Promise<void> {
  // Navigate to app — triggers Keycloak check-sso
  await page.goto('/');

  // Click the Login link in header
  await page.getByRole('link', { name: 'Login' }).click();

  // Wait for Keycloak login form to appear
  await page.waitForURL(/\/auth\/realms\/techstore\//);

  // Fill Keycloak credentials
  await page.locator('#username').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.locator('#kc-login').click();

  // Wait for redirect back to the app
  await page.waitForURL('http://localhost/');

  // Verify authentication succeeded — Logout button appears
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({
    timeout: 10_000,
  });
}

// ─── Setup Tests ─────────────────────────────────────────────────────────────

setup('authenticate as mario', async ({ page }) => {
  await keycloakLogin(page, USERS.mario);
  await page.context().storageState({ path: storageStatePath('mario') });
});

setup('authenticate as admin', async ({ page }) => {
  await keycloakLogin(page, USERS.admin);
  await page.context().storageState({ path: storageStatePath('admin') });
});

setup('authenticate as blocked', async ({ page }) => {
  await keycloakLogin(page, USERS.blocked);
  await page.context().storageState({ path: storageStatePath('blocked') });
});
