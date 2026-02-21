import { test, expect } from '@playwright/test';

/**
 * Game interaction tests — verify core game mechanics work end-to-end.
 *
 * Covers:
 * - Drawing cards from stock
 * - New game button
 * - Difficulty change
 * - Toggle controls
 */
test.describe('Game Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('game-board')).toBeVisible();
  });

  test('clicking draw pile moves a card to discard pile', async ({ page }) => {
    // Discard should start empty
    const discardPile = page.getByTestId('discard-pile');
    await expect(discardPile.locator('[data-testid^="card-"]')).toHaveCount(0);

    // Click the draw pile
    await page.getByTestId('draw-pile').click();

    // Now discard pile should have a face-up card
    const discardCards = discardPile.locator('[data-card-faceup="true"]');
    await expect(discardCards).toHaveCount(1);

    // Move counter should increment
    await expect(page.getByTestId('move-counter')).toContainText('1');
  });

  test('drawing multiple cards increments move counter', async ({ page }) => {
    const drawPile = page.getByTestId('draw-pile');

    // Draw 3 cards
    await drawPile.click();
    await drawPile.click();
    await drawPile.click();

    // Move counter should show 3
    await expect(page.getByTestId('move-counter')).toContainText('3');
  });

  test('new game button resets the game', async ({ page }) => {
    // Draw a card first to change the state
    await page.getByTestId('draw-pile').click();
    await expect(page.getByTestId('move-counter')).toContainText('1');

    // Click New Game
    await page.getByTestId('new-game-btn').click();

    // Move counter should reset to 0
    await expect(page.getByTestId('move-counter')).toContainText('0');

    // Discard pile should be empty again
    const discardPile = page.getByTestId('discard-pile');
    await expect(discardPile.locator('[data-testid^="card-"]')).toHaveCount(0);
  });

  test('changing difficulty starts a new game', async ({ page }) => {
    // Draw a card to change state
    await page.getByTestId('draw-pile').click();
    await expect(page.getByTestId('move-counter')).toContainText('1');

    // Change difficulty to level 1
    await page.getByTestId('difficulty-btn-1').click();

    // Should reset game — move counter back to 0
    await expect(page.getByTestId('move-counter')).toContainText('0');
  });

  test('valid moves toggle button works', async ({ page }) => {
    const btn = page.getByTestId('valid-moves-btn');
    await expect(btn).toContainText('Valid Moves');

    // Initially should have green background (on state — showValidMoves defaults to true)
    await expect(btn).toHaveClass(/bg-green-600/);

    // Click to toggle off
    await btn.click();
    await expect(btn).toHaveClass(/bg-gray-300/);

    // Click again to toggle back on
    await btn.click();
    await expect(btn).toHaveClass(/bg-green-600/);
  });

  test('god mode toggle button works', async ({ page }) => {
    const btn = page.getByTestId('god-mode-btn');
    await expect(btn).toContainText('God Mode');

    // Toggle on — the button text changes emoji
    await btn.click();
    // Verify button state changed (the bg class changes)
    await expect(btn).toHaveClass(/bg-purple-600/);

    // Toggle off
    await btn.click();
    await expect(btn).toHaveClass(/bg-gray-300/);
  });

  test('clicking a face-up tableau card selects it', async ({ page }) => {
    // Find first face-up card in first column (column 0 always has 1 face-up card)
    const column0 = page.getByTestId('tableau-column-0');
    const faceUpCard = column0.locator('[data-card-faceup="true"]').first();
    await expect(faceUpCard).toBeVisible();

    // Click to select
    await faceUpCard.click();

    // Selected card should get the yellow ring class
    await expect(faceUpCard).toHaveClass(/ring-yellow-400/);

    // Click again to deselect
    await faceUpCard.click();
    await expect(faceUpCard).not.toHaveClass(/ring-yellow-400/);
  });
});
