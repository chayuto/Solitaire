import { test, expect } from '@playwright/test';
import { tableauFingerprint } from './helpers';

/**
 * Smoke tests — verify the game loads and all major areas render correctly.
 * These are the first tests to run: if they fail, nothing else matters.
 */
test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the game board to be fully rendered
    await expect(page.getByTestId('game-board')).toBeVisible();
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Solitaire/i);
  });

  test('game board renders', async ({ page }) => {
    await expect(page.getByTestId('game-board')).toBeVisible();
    // Header text
    await expect(page.getByRole('heading', { name: 'Solitaire' })).toBeVisible();
  });

  test('all seven tableau columns are present', async ({ page }) => {
    for (let i = 0; i < 7; i++) {
      await expect(page.getByTestId(`tableau-column-${i}`)).toBeVisible();
    }
  });

  test('all four foundation piles are present', async ({ page }) => {
    for (const suit of ['hearts', 'diamonds', 'clubs', 'spades']) {
      await expect(page.getByTestId(`foundation-${suit}`)).toBeVisible();
    }
  });

  test('draw pile is present', async ({ page }) => {
    await expect(page.getByTestId('draw-pile')).toBeVisible();
  });

  test('discard pile is present', async ({ page }) => {
    await expect(page.getByTestId('discard-pile')).toBeVisible();
  });

  test('control panel is present with key controls', async ({ page }) => {
    await expect(page.getByTestId('control-panel')).toBeVisible();
    await expect(page.getByTestId('new-game-btn')).toBeVisible();
    await expect(page.getByTestId('move-counter')).toBeVisible();
  });

  test('Parallel Window opens an independent session with the same board', async ({
    page,
    context,
  }) => {
    await page.goto('/?seed=99&difficulty=2');
    await expect(page.getByTestId('game-board')).toBeVisible();

    const popupPromise = context.waitForEvent('page');
    await page.getByTestId('parallel-session-btn').click();
    const popup = await popupPromise;

    await expect(popup.getByTestId('game-board')).toBeVisible();
    await popup.waitForFunction(() => typeof window.__solitaire !== 'undefined');

    // The new window carries the seed, deals the same board...
    expect(popup.url()).toContain('seed=99');
    expect(await tableauFingerprint(popup)).toEqual(await tableauFingerprint(page));

    // ...but is an independent session.
    const originalId = await page.evaluate(() => window.__solitaire!.getSummary().gameSessionId);
    const popupId = await popup.evaluate(() => window.__solitaire!.getSummary().gameSessionId);
    expect(popupId).toBeTruthy();
    expect(popupId).not.toBe(originalId);

    await popup.close();
  });
});
