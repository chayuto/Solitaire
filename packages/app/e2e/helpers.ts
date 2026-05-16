import { expect, type Page } from '@playwright/test';
import type { GameSummary, SolitaireTestBridge } from '../src/testBridge';

/** Re-export bridge types so specs have a single import site. */
export type { GameSummary, SolitaireTestBridge };

/**
 * Waits until the game board has rendered and the `window.__solitaire` test
 * bridge is installed. Call once after `page.goto(...)`.
 */
export async function waitForGame(page: Page): Promise<void> {
  await expect(page.getByTestId('game-board')).toBeVisible();
  await page.waitForFunction(() => typeof window.__solitaire !== 'undefined');
}

/** Reads the compact game summary via the test bridge. */
export function summary(page: Page): Promise<GameSummary> {
  return page.evaluate(() => window.__solitaire!.getSummary());
}

/**
 * Returns the ordered list of every card in the tableau (id + face state),
 * top-to-bottom and left-to-right — a stable fingerprint of the deal used for
 * determinism checks.
 */
export function tableauFingerprint(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    window.__solitaire!.getState().tableau.flatMap((column) =>
      column.map((card) => `${card.id}:${card.faceUp ? 'U' : 'D'}`),
    ),
  );
}
