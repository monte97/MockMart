/**
 * Authentication fixtures for MockMart E2E tests.
 *
 * Part of: Parte 8 - Authentication Testing
 *
 * Provides:
 *   - USERS dict with credentials and metadata
 *   - storageStatePath() helper to locate saved auth state
 *   - Extended test fixture with userKey option
 */

import { test as base, expect } from '@playwright/test';
import path from 'path';

// ─── Test Users ──────────────────────────────────────────────────────────────

export const USERS = {
  mario: {
    username: 'mario',
    email: 'mario.rossi@example.com',
    password: 'mario123',
    role: 'user' as const,
    canCheckout: true,
  },
  admin: {
    username: 'admin',
    email: 'admin@techstore.com',
    password: 'admin123',
    role: 'admin' as const,
    canCheckout: true,
  },
  blocked: {
    username: 'blocked',
    email: 'blocked@example.com',
    password: 'blocked123',
    role: 'user' as const,
    canCheckout: false,
  },
} as const;

export type UserKey = keyof typeof USERS;

// ─── Storage State ───────────────────────────────────────────────────────────

const AUTH_DIR = path.join(__dirname, '../.auth');

export function storageStatePath(userKey: UserKey): string {
  return path.join(AUTH_DIR, `${userKey}.json`);
}

// ─── Fixture ─────────────────────────────────────────────────────────────────

export const test = base.extend<{ userKey: UserKey }>({
  userKey: ['mario', { option: true }],
});

export { expect };
