import { test, expect } from '@playwright/test';
import { waitForGame, summary, tableauFingerprint } from './helpers';

/**
 * Validates deterministic seeding — the foundation of high-fidelity testing.
 * A `?seed=` URL must produce the exact same deal every time, and the bridge's
 * `newGame({ seed })` must match the URL-driven deal.
 */
test.describe('Deterministic seeding', () => {
  test('the same seed produces an identical deal across reloads', async ({ page }) => {
    await page.goto('/?seed=42');
    await waitForGame(page);
    const first = await tableauFingerprint(page);

    await page.goto('/?seed=42');
    await waitForGame(page);
    const second = await tableauFingerprint(page);

    expect(second).toEqual(first);
    expect(first).toHaveLength(28); // 1+2+3+4+5+6+7 tableau cards
  });

  test('different seeds produce different deals', async ({ page }) => {
    await page.goto('/?seed=42');
    await waitForGame(page);
    const dealA = await tableauFingerprint(page);

    await page.goto('/?seed=999');
    await waitForGame(page);
    const dealB = await tableauFingerprint(page);

    expect(dealB).not.toEqual(dealA);
  });

  test('the difficulty URL parameter is applied', async ({ page }) => {
    await page.goto('/?seed=7&difficulty=1');
    await waitForGame(page);
    expect((await summary(page)).difficulty).toBe(1);

    await page.goto('/?seed=7&difficulty=5');
    await waitForGame(page);
    expect((await summary(page)).difficulty).toBe(5);
  });

  test('bridge newGame({ seed }) matches the URL-driven deal', async ({ page }) => {
    await page.goto('/?seed=12345');
    await waitForGame(page);
    const urlDeal = await tableauFingerprint(page);

    await page.goto('/'); // random deal
    await waitForGame(page);
    await page.evaluate(() => window.__solitaire!.newGame({ seed: 12345 }));
    const bridgeDeal = await tableauFingerprint(page);

    expect(bridgeDeal).toEqual(urlDeal);
  });
});
