import { test, expect } from '@playwright/test';
import { waitForGame, summary, loadScenario } from './helpers';

/**
 * Exercises the named board-state fixtures (`src/testScenarios.ts`) end-to-end.
 * These give tests a fast, deterministic jump to positions that are impractical
 * to reach by playing from a seed.
 */

test.describe('Board-state scenarios', () => {
  test('the bridge exposes the expected scenario names', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);

    const names = await page.evaluate(() => window.__solitaire!.listScenarios());
    expect(names).toEqual(
      expect.arrayContaining(['oneMoveFromWinning', 'autoCompleteReady', 'fourKingsToWin']),
    );
  });

  test('loadScenario rejects an unknown name', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);

    const ok = await page.evaluate(() => window.__solitaire!.loadScenario('does-not-exist'));
    expect(ok).toBe(false);
  });

  test('every scenario loads a complete, valid 52-card board', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);

    for (const name of ['oneMoveFromWinning', 'autoCompleteReady', 'fourKingsToWin'] as const) {
      await loadScenario(page, name);
      const s = await summary(page);
      const tableauTotal = s.tableauSizes.reduce((a, b) => a + b, 0);
      expect(s.foundationTotal + tableauTotal + s.drawPile + s.discardPile).toBe(52);
      expect(s.gameWon).toBe(false);
    }
  });

  test('autoCompleteReady is solved to a win by auto-play', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
    await loadScenario(page, 'autoCompleteReady');

    // The Ace of each suit is exposed — reachable via the new ARIA button role.
    await expect(page.getByRole('button', { name: 'A of hearts' })).toBeVisible();

    await page.evaluate(() => window.__solitaire!.toggleAutoPlay());

    await expect.poll(() => summary(page).then((s) => s.foundationTotal), {
      timeout: 20_000,
    }).toBe(52);
    expect(await page.evaluate(() => window.__solitaire!.isWon())).toBe(true);
  });

  test('fourKingsToWin: one foundation click hands off to auto-complete', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
    await loadScenario(page, 'fourKingsToWin');

    // Moving the first King leaves the board sorted with the stock empty, so
    // auto-complete takes over and finishes the remaining three Kings.
    await page.getByTestId('card-hearts-K').click();
    await page.getByTestId('foundation-hearts').click();

    await expect(page.getByTestId('win-modal')).toBeVisible({ timeout: 10_000 });
    const s = await summary(page);
    expect(s.gameWon).toBe(true);
    expect(s.foundationTotal).toBe(52);
  });
});
