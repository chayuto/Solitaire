import { defineConfig, devices } from '@playwright/test';

/**
 * Post-deploy Playwright configuration.
 *
 * Unlike `playwright.config.ts` (which boots a local Vite dev server), this
 * config runs `post-deploy.spec.ts` against an already-deployed URL — no
 * webServer is started. Use it to verify a release in production:
 *
 *   pnpm run test:e2e:deploy
 *   DEPLOY_URL=https://chayuto.github.io/Solitaire/ pnpm run test:e2e:deploy
 *
 * The default targets the production custom domain. It is served over HTTP
 * (the custom domain has no valid TLS certificate yet), so `ignoreHTTPSErrors`
 * is enabled to tolerate either scheme.
 */
const deployURL = process.env.DEPLOY_URL ?? 'http://solitaire.chayuto.com/';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'post-deploy.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /* Networks flake; a deployed target is worth a couple of retries. */
  retries: 2,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : [['list']],
  use: {
    baseURL: deployURL,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
