import { test, expect } from '@playwright/test';
import { waitForGame, summary } from './helpers';
import type { Card, GameState, Rank, Suit } from '../src/types';

/**
 * End-to-end win journey — plays the app the way a real player would, through
 * visible UI only. Winning a real deal is impractical to script, so the bridge
 * crafts a deterministic one-move-from-winning state; the actual winning move
 * is then performed by real clicks. This covers the win path that the deal- and
 * interaction-focused specs cannot reach.
 */

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function card(suit: Suit, rank: Rank): Card {
  return { suit, rank, faceUp: true, id: `${suit}-${rank}` };
}

/** A full A→K foundation pile for one suit. */
function fullFoundation(suit: Suit): Card[] {
  return RANKS.map((rank) => card(suit, rank));
}

/**
 * A game one move from victory: hearts/diamonds/clubs complete, spades filled
 * A→Q, and the spades King sitting face-up on tableau column 0.
 */
function oneMoveFromWinning(): string {
  const state: GameState = {
    drawPile: [],
    discardPile: [],
    foundations: {
      hearts: fullFoundation('hearts'),
      diamonds: fullFoundation('diamonds'),
      clubs: fullFoundation('clubs'),
      spades: RANKS.slice(0, 12).map((rank) => card('spades', rank)),
    },
    tableau: [[card('spades', 'K')], [], [], [], [], [], []],
    moveHistory: [],
    showValidMoves: true,
    godMode: false,
    autoPlayEnabled: false,
    autoPlayInProgress: false,
    difficulty: 3,
    gameWon: false,
    completionProgress: 98,
    replayMode: false,
    replayIndex: 0,
    replayPaused: false,
    replaySpeed: 1000,
  };
  return JSON.stringify(state);
}

test.describe('User journey: winning the game', () => {
  test('completing the last move shows the win modal and statistics', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
    await page.evaluate((json) => window.__solitaire!.loadState(json), oneMoveFromWinning());

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
    await page.evaluate((json) => window.__solitaire!.loadState(json), oneMoveFromWinning());

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
