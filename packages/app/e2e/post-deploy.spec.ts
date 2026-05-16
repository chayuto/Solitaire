import { test, expect, type ConsoleMessage } from '@playwright/test';

/**
 * Post-deploy smoke tests — exercise the *live, deployed* site through real UI
 * interactions only (test ids + clicks), with no `window.__solitaire` bridge.
 *
 * The bridge is a build-time testability hook and is not relied on here: a
 * post-deploy check must verify exactly what a real visitor receives from the
 * production CDN. Run via `playwright.deploy.config.ts`, which points the
 * baseURL at the deployed URL instead of a local dev server.
 *
 * Targets `process.env.DEPLOY_URL` (see playwright.deploy.config.ts), defaulting
 * to the production custom domain.
 */

test.describe('post-deploy smoke', () => {
  test('site responds 200 and renders the game board', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'networkidle' });
    expect(response?.status(), 'deployed site should return HTTP 200').toBe(200);

    await expect(page).toHaveTitle(/Solitaire/i);
    await expect(page.getByTestId('game-board')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Solitaire' })).toBeVisible();
  });

  test('all play areas are present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('game-board')).toBeVisible();

    for (let i = 0; i < 7; i++) {
      await expect(page.getByTestId(`tableau-column-${i}`)).toBeVisible();
    }
    for (const suit of ['hearts', 'diamonds', 'clubs', 'spades']) {
      await expect(page.getByTestId(`foundation-${suit}`)).toBeVisible();
    }
    await expect(page.getByTestId('draw-pile')).toBeVisible();
    await expect(page.getByTestId('discard-pile')).toBeVisible();
    await expect(page.getByTestId('control-panel')).toBeVisible();
    await expect(page.getByTestId('new-game-btn')).toBeVisible();
  });

  test('loads with no console or page errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('game-board')).toBeVisible();

    expect(errors, 'deployed site logged JS errors').toEqual([]);
  });

  test('drawing a card is reflected in the discard pile and move counter', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('game-board')).toBeVisible();

    const discard = page.getByTestId('discard-pile');
    const moveCounter = page.getByTestId('move-counter');

    await expect(discard.locator('[data-testid^="card-"]')).toHaveCount(0);
    await expect(moveCounter).toContainText('0');

    await page.getByTestId('draw-pile').click();

    await expect(discard.locator('[data-testid^="card-"]')).not.toHaveCount(0);
    await expect(moveCounter).toContainText('1');
  });

  test('"New Game" deals a fresh board and resets the move counter', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('game-board')).toBeVisible();

    // Make a move so the counter is non-zero before we reset.
    await page.getByTestId('draw-pile').click();
    await expect(page.getByTestId('move-counter')).toContainText('1');

    await page.getByTestId('new-game-btn').click();

    await expect(page.getByTestId('move-counter')).toContainText('0');
    await expect(page.getByTestId('discard-pile').locator('[data-testid^="card-"]')).toHaveCount(
      0,
    );
  });

  test('PWA and SEO static assets are served', async ({ page, request }) => {
    // goto first so relative request URLs resolve against the deployed origin.
    await page.goto('/');

    for (const asset of ['manifest.json', 'robots.txt', 'sitemap.xml', 'icons/icon-192.png']) {
      const res = await request.get(new URL(asset, page.url()).href);
      expect(res.status(), `${asset} should be served`).toBe(200);
    }
  });

  test('the favicon is served and is not the Vite placeholder', async ({ page, request }) => {
    await page.goto('/');

    const href = await page
      .locator('link[rel="icon"][type="image/svg+xml"]')
      .getAttribute('href');
    expect(href, 'an SVG favicon should be linked').toBeTruthy();
    expect(href, 'favicon must not be the default Vite logo').not.toContain('vite.svg');

    const res = await request.get(new URL(href!, page.url()).href);
    expect(res.status(), 'favicon should be served').toBe(200);
  });
});
