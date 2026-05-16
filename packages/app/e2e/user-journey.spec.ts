import { test, expect } from '@playwright/test';
import { waitForGame, summary, loadScenario } from './helpers';

/**
 * End-to-end win journey — plays the app the way a real player would, through
 * visible UI only. Winning a real deal is impractical to script, so the
 * `oneMoveFromWinning` scenario fixture jumps straight to a deterministic
 * one-move-from-victory state; the actual winning move is then performed by
 * real clicks. This covers the win path that the deal- and interaction-focused
 * specs cannot reach.
 */

test.describe('User journey: winning the game', () => {
  test('completing the last move shows the win modal and statistics', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
    await loadScenario(page, 'oneMoveFromWinning');

    // Not won yet — the modal must be absent.
    await expect(page.getByTestId('win-modal')).toBeHidden();

    // The player clicks the last King, then its foundation — pure click-to-move.
    await page.getByTestId('card-spades-K').click();
    await expect.poll(() => summary(page).then((s) => s.selectedCard)).toBe('spades-K');
    await page.getByTestId('foundation-spades').click();

    const modal = page.getByTestId('win-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Congratulations!')).toBeVisible();

    const s = await summary(page);
    expect(s.gameWon).toBe(true);
    expect(s.foundationTotal).toBe(52);
  });

  test('"New Game" in the win modal dismisses it and deals a fresh game', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForGame(page);
    await loadScenario(page, 'oneMoveFromWinning');

    await page.getByTestId('card-spades-K').click();
    await page.getByTestId('foundation-spades').click();
    await expect(page.getByTestId('win-modal')).toBeVisible();

    await page.getByTestId('win-modal').getByRole('button', { name: 'New Game' }).click();

    await expect(page.getByTestId('win-modal')).toBeHidden();
    const s = await summary(page);
    expect(s.gameWon).toBe(false);
    expect(s.foundationTotal).toBe(0);
    expect(s.tableauSizes).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
