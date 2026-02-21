import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for Solitaire app.
 *
 * Designed for:
 * - Headless CI environments (GitHub Actions)
 * - Headless agentic coding environments
 * - Local development with optional headed mode
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in parallel for speed */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Limit parallel workers in CI for stability */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter configuration */
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'never' }]],
  /* Shared settings for all tests */
  use: {
    /* Base URL for the dev server */
    baseURL: 'http://localhost:5173',
    /* Collect trace on failure for debugging */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },
  /* Configure projects for cross-browser testing */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* Start the Vite dev server before running tests */
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
