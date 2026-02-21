import { test, expect } from '@playwright/test';

/**
 * Game layout tests — verify card distribution after initial deal.
 *
 * Solitaire Klondike deal:
 *   - 7 tableau columns with 1,2,3,4,5,6,7 cards respectively (28 total)
 *   - Top card of each column is face-up, rest face-down
 *   - 24 cards in draw pile, 0 in discard pile
 *   - All 52 cards accounted for
 */
test.describe('Game Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('game-board')).toBeVisible();
  });

  test('tableau columns have correct number of cards', async ({ page }) => {
    // Each column i (0-indexed) should have (i + 1) cards
    for (let col = 0; col < 7; col++) {
      const column = page.getByTestId(`tableau-column-${col}`);
      // Count all card elements within this column
      const cards = column.locator('[data-testid^="card-"]');
      await expect(cards).toHaveCount(col + 1);
    }
  });

  test('top card of each tableau column is face-up', async ({ page }) => {
    for (let col = 0; col < 7; col++) {
      const column = page.getByTestId(`tableau-column-${col}`);
      const cards = column.locator('[data-testid^="card-"]');
      const count = await cards.count();
      // The last card (top of visual stack) should be face-up
      const lastCard = cards.nth(count - 1);
      await expect(lastCard).toHaveAttribute('data-card-faceup', 'true');
    }
  });

  test('non-top cards in multi-card columns are face-down', async ({ page }) => {
    // Columns 1-6 (0-indexed) have more than 1 card, check face-down cards
    for (let col = 1; col < 7; col++) {
      const column = page.getByTestId(`tableau-column-${col}`);
      const cards = column.locator('[data-testid^="card-"]');
      const count = await cards.count();
      // All cards except the last should be face-down
      for (let i = 0; i < count - 1; i++) {
        await expect(cards.nth(i)).toHaveAttribute('data-card-faceup', 'false');
      }
    }
  });

  test('draw pile has face-down cards', async ({ page }) => {
    const drawPile = page.getByTestId('draw-pile');
    // Draw pile should contain at least one face-down card
    const faceDownCards = drawPile.locator('[data-card-faceup="false"]');
    await expect(faceDownCards.first()).toBeVisible();
  });

  test('discard pile starts empty', async ({ page }) => {
    const discardPile = page.getByTestId('discard-pile');
    const cards = discardPile.locator('[data-testid^="card-"]');
    await expect(cards).toHaveCount(0);
  });

  test('foundation piles start empty', async ({ page }) => {
    for (const suit of ['hearts', 'diamonds', 'clubs', 'spades']) {
      const foundation = page.getByTestId(`foundation-${suit}`);
      const cards = foundation.locator('[data-testid^="card-"]');
      await expect(cards).toHaveCount(0);
    }
  });

  test('move counter starts at 0', async ({ page }) => {
    const moveCounter = page.getByTestId('move-counter');
    await expect(moveCounter).toContainText('0');
  });
});
