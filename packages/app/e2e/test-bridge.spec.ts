import { test, expect } from '@playwright/test';
import { waitForGame, summary } from './helpers';
import type { GameState } from '../src/types';

/**
 * Validates the `window.__solitaire` test bridge: introspection, deterministic
 * setup via crafted states, and driving moves without pixel simulation.
 */

/** Builds a minimal but valid game state with a single Ace ready to play. */
function craftState(): string {
  const state: GameState = {
    drawPile: [],
    discardPile: [],
    foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
    tableau: [
      [{ suit: 'hearts', rank: 'A', faceUp: true, id: 'hearts-A' }],
      [],
      [],
      [],
      [],
      [],
      [],
    ],
    moveHistory: [],
    showValidMoves: true,
    godMode: false,
    autoPlayEnabled: false,
    autoPlayInProgress: false,
    difficulty: 3,
    gameWon: false,
    completionProgress: 0,
    replayMode: false,
    replayIndex: 0,
    replayPaused: false,
    replaySpeed: 1000,
  };
  return JSON.stringify(state);
}

test.describe('window.__solitaire test bridge', () => {
  test('is installed with the expected shape', async ({ page }) => {
    await page.goto('/?seed=1');
    await waitForGame(page);

    const info = await page.evaluate(() => ({
      version: window.__solitaire!.version,
      keys: Object.keys(window.__solitaire!).sort(),
    }));

    expect(info.version).toBe(2);
    expect(info.keys).toEqual(
      [
        'deselect',
        'draw',
        'exportState',
        'findCard',
        'getState',
        'getSummary',
        'isWon',
        'listScenarios',
        'loadScenario',
        'loadState',
        'moveToFoundation',
        'moveToTableau',
        'newGame',
        'select',
        'toggleAutoPlay',
        'version',
      ].sort(),
    );
  });

  test('getSummary reports a consistent fresh deal', async ({ page }) => {
    await page.goto('/?seed=1');
    await waitForGame(page);
    const s = await summary(page);

    expect(s.moveCount).toBe(0);
    expect(s.foundationTotal).toBe(0);
    expect(s.tableauSizes).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(s.drawPile).toBe(24); // 52 - 28 dealt
    expect(s.tableauFaceDown).toBe(21); // 28 dealt - 7 face-up tops
    expect(s.gameWon).toBe(false);
  });

  test('loadState restores a crafted deterministic scenario', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);

    const loaded = await page.evaluate(
      (json) => window.__solitaire!.loadState(json),
      craftState(),
    );
    expect(loaded).toBe(true);

    const s = await summary(page);
    expect(s.tableauSizes).toEqual([1, 0, 0, 0, 0, 0, 0]);
    expect(s.drawPile).toBe(0);
  });

  test('loadState rejects malformed JSON', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
    const ok = await page.evaluate(() => window.__solitaire!.loadState('{"bad":true}'));
    expect(ok).toBe(false);
  });

  test('drives a foundation move through the bridge', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
    await page.evaluate((json) => window.__solitaire!.loadState(json), craftState());

    await page.evaluate(() => {
      window.__solitaire!.select('tableau', 0, 0);
      window.__solitaire!.moveToFoundation('hearts');
    });

    const s = await summary(page);
    expect(s.foundations.hearts).toBe(1);
    expect(s.foundationTotal).toBe(1);
    expect(s.tableauSizes[0]).toBe(0);
  });

  test('findCard locates a card by id', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
    await page.evaluate((json) => window.__solitaire!.loadState(json), craftState());

    const located = await page.evaluate(() => window.__solitaire!.findCard('hearts-A'));
    expect(located).toEqual({
      source: 'tableau',
      columnIndex: 0,
      cardIndex: 0,
      faceUp: true,
    });

    const missing = await page.evaluate(() => window.__solitaire!.findCard('spades-K'));
    expect(missing).toBeNull();
  });

  test('draw moves a card from stock to the discard pile', async ({ page }) => {
    await page.goto('/?seed=1');
    await waitForGame(page);

    const before = await summary(page);
    await page.evaluate(() => window.__solitaire!.draw());
    const after = await summary(page);

    expect(after.drawPile).toBe(before.drawPile - 1);
    expect(after.discardPile).toBe(before.discardPile + 1);
    expect(after.discardTop).not.toBeNull();
  });
});
