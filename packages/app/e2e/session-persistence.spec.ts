import { test, expect, type Page } from '@playwright/test';
import { waitForGame, summary } from './helpers';

/**
 * Session persistence — games autosave to localStorage and survive a reload,
 * with each board (including Parallel Windows) kept independently.
 */

/** Wait until the active game's autosave entry exists in localStorage. */
async function waitForSave(page: Page): Promise<void> {
  const id = (await summary(page)).gameSessionId;
  await expect
    .poll(() =>
      page.evaluate(
        (sessionId) => localStorage.getItem(`solitaire:save:${sessionId}`) !== null,
        id,
      ),
    )
    .toBe(true);
}

test.describe('Session persistence', () => {
  test('autosaves a played game and restores it after a reload', async ({ page }) => {
    await page.goto('/?seed=12345');
    await waitForGame(page);
    const before = await summary(page);

    await page.evaluate(() => {
      window.__solitaire!.draw();
      window.__solitaire!.draw();
    });
    expect((await summary(page)).moveCount).toBe(before.moveCount + 2);

    // The tab is anchored to its session in the URL.
    expect(page.url()).toContain('session=');
    await waitForSave(page);

    await page.reload();
    await waitForGame(page);

    const after = await summary(page);
    expect(after.gameSessionId).toBe(before.gameSessionId);
    expect(after.moveCount).toBe(before.moveCount + 2);
  });

  test('parallel windows persist and restore independent boards', async ({
    page,
    context,
  }) => {
    await page.goto('/?seed=111');
    await waitForGame(page);

    // Window A: two moves.
    await page.evaluate(() => {
      window.__solitaire!.draw();
      window.__solitaire!.draw();
    });
    await waitForSave(page);
    const a = await summary(page);
    expect(a.moveCount).toBe(2);

    // Open a Parallel Window — a fresh, independent session on the same board.
    const popupPromise = context.waitForEvent('page');
    await page.getByTestId('parallel-session-btn').click();
    const popup = await popupPromise;
    await waitForGame(popup);

    // Window B: four moves.
    await popup.evaluate(() => {
      window.__solitaire!.draw();
      window.__solitaire!.draw();
      window.__solitaire!.draw();
      window.__solitaire!.draw();
    });
    await waitForSave(popup);
    const b = await summary(popup);
    expect(b.moveCount).toBe(4);
    expect(b.gameSessionId).not.toBe(a.gameSessionId);

    // Reloading each window restores its OWN board — no clobbering.
    await page.reload();
    await waitForGame(page);
    const aAfter = await summary(page);
    expect(aAfter.gameSessionId).toBe(a.gameSessionId);
    expect(aAfter.moveCount).toBe(2);

    await popup.reload();
    await waitForGame(popup);
    const bAfter = await summary(popup);
    expect(bAfter.gameSessionId).toBe(b.gameSessionId);
    expect(bAfter.moveCount).toBe(4);

    await popup.close();
  });

  test('the saved-games manager lists games and resumes another one', async ({
    page,
  }) => {
    // First game.
    await page.goto('/?seed=222');
    await waitForGame(page);
    await page.evaluate(() => window.__solitaire!.draw());
    await waitForSave(page);
    const first = await summary(page);
    expect(first.moveCount).toBe(1);

    // Start a second game — a new session.
    await page.getByTestId('new-game-btn').click();
    await waitForGame(page);
    await page.evaluate(() => {
      window.__solitaire!.draw();
      window.__solitaire!.draw();
    });
    await waitForSave(page);
    const second = await summary(page);
    expect(second.gameSessionId).not.toBe(first.gameSessionId);

    // The manager lists both games.
    await page.getByTestId('session-manager-btn').click();
    await expect(page.getByTestId('session-manager-modal')).toBeVisible();
    await expect(page.getByTestId(`session-row-${first.gameSessionId}`)).toBeVisible();
    await expect(page.getByTestId(`session-row-${second.gameSessionId}`)).toBeVisible();

    // Resuming the first game switches the board back to it.
    await page
      .getByTestId(`session-row-${first.gameSessionId}`)
      .getByTestId('resume-session-btn')
      .click();
    await expect(page.getByTestId('session-manager-modal')).not.toBeVisible();

    const resumed = await summary(page);
    expect(resumed.gameSessionId).toBe(first.gameSessionId);
    expect(resumed.moveCount).toBe(1);
  });

  test('the saved-games manager deletes a game after confirmation', async ({ page }) => {
    await page.goto('/?seed=444');
    await waitForGame(page);
    await page.evaluate(() => window.__solitaire!.draw());
    await waitForSave(page);
    const id = (await summary(page)).gameSessionId;

    await page.getByTestId('session-manager-btn').click();
    const row = page.getByTestId(`session-row-${id}`);
    await expect(row).toBeVisible();

    // The first click arms the confirmation; the second deletes.
    const del = row.getByTestId('delete-session-btn');
    await del.click();
    await expect(del).toHaveText('Confirm?');
    await del.click();

    await expect(page.getByTestId(`session-row-${id}`)).not.toBeVisible();
  });

  test('a clean visit with saved games opens the picker', async ({ page, context }) => {
    // Create a saved game in this browser.
    await page.goto('/?seed=555');
    await waitForGame(page);
    await page.evaluate(() => window.__solitaire!.draw());
    await waitForSave(page);

    // A brand-new tab (its own empty sessionStorage) visiting "/" is a clean
    // visit — with saved games present, it opens the picker.
    const fresh = await context.newPage();
    await fresh.goto('/');
    await waitForGame(fresh);
    await expect(fresh.getByTestId('session-manager-modal')).toBeVisible();
    await fresh.close();
  });
});
