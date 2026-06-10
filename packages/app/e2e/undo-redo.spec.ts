import { test, expect } from '@playwright/test';
import type { SolitaireTestBridge } from '../src/testBridge';

declare global {
  interface Window {
    __solitaire: SolitaireTestBridge;
  }
}

/** Summary helper via the agent bridge. */
const summary = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__solitaire.getSummary());

test.describe('Undo/redo', () => {
  test.beforeEach(async ({ page }) => {
    // Seeded deal: deterministic board every run.
    await page.goto('/?seed=42&difficulty=3');
    await page.waitForFunction(() => window.__solitaire !== undefined);
  });

  test('undo button rewinds moves made through the bridge', async ({ page }) => {
    const before = await summary(page);

    await page.evaluate(() => {
      window.__solitaire.draw();
      window.__solitaire.draw();
      window.__solitaire.draw();
    });
    expect((await summary(page)).moveCount).toBe(before.moveCount + 3);
    expect((await summary(page)).undoDepth).toBe(3);

    await page.getByTestId('undo-button').click();
    await page.getByTestId('undo-button').click();

    const after = await summary(page);
    expect(after.moveCount).toBe(before.moveCount + 1);
    expect(after.undoDepth).toBe(1);
    expect(after.redoDepth).toBe(2);
    expect(after.drawPile).toBe(before.drawPile - 1);
  });

  test('redo re-applies and the buttons disable at the stack ends', async ({ page }) => {
    const undoBtn = page.getByTestId('undo-button');
    const redoBtn = page.getByTestId('redo-button');

    // Fresh game: both disabled.
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeDisabled();

    await page.evaluate(() => window.__solitaire.draw());
    await expect(undoBtn).toBeEnabled();

    await undoBtn.click();
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeEnabled();

    await redoBtn.click();
    await expect(redoBtn).toBeDisabled();
    expect((await summary(page)).undoDepth).toBe(1);
  });

  test('Cmd/Ctrl+Z undoes; +Shift redoes', async ({ page }) => {
    await page.evaluate(() => window.__solitaire.draw());
    expect((await summary(page)).undoDepth).toBe(1);

    await page.keyboard.press('ControlOrMeta+z');
    expect((await summary(page)).undoDepth).toBe(0);
    expect((await summary(page)).redoDepth).toBe(1);

    await page.keyboard.press('ControlOrMeta+Shift+z');
    expect((await summary(page)).undoDepth).toBe(1);
    expect((await summary(page)).redoDepth).toBe(0);
  });

  test('the activity log shows the undo as an event row', async ({ page }) => {
    await page.evaluate(() => {
      window.__solitaire.draw();
      window.__solitaire.undo();
    });
    await expect(
      page.getByTestId('activity-log-entry').filter({ hasText: 'Move undone' }),
    ).toHaveCount(1);
  });
});
