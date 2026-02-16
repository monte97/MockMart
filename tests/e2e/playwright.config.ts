import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for MockMart E2E tests.
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Reporter to use */
  reporter: [
    ['html'],
    ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for MockMart (via nginx gateway) */
    baseURL: process.env.BASE_URL || 'http://localhost',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    /* Setup project for authentication */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },
  ],

  /* Run MockMart before starting the tests */
  // Uncomment if you want Playwright to start MockMart automatically
  // webServer: {
  //   command: 'cd ../../ && make up',
  //   url: 'http://localhost',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});
