import { test, expect } from '@playwright/test';
import { waitForGame, loadScenario } from './helpers';

/**
 * Game Insights dashboard: the live progress bar + the Progress / Card Flow
 * charts that track a game (or the AI auto-player) move by move.
 */
test.describe('Game Insights panel', () => {
  test('renders a live progress bar and an empty-state hint on a fresh deal', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await waitForGame(page);

    await expect(page.getByTestId('game-insights-panel')).toBeVisible();

    const bar = page.getByTestId('insights-progress-bar');
    await expect(bar).toHaveAttribute('aria-valuenow', '0');
    await expect(page.getByTestId('insights-stat-moves')).toHaveText('0 moves');

    // One baseline point → not enough to plot a trend yet.
    await expect(page.getByTestId('insights-chart-empty')).toBeVisible();
  });

  test('fills the progress bar to 100% as the game is auto-completed', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await waitForGame(page);

    await loadScenario(page, 'autoCompleteReady');
    await page.evaluate(() => window.__solitaire!.toggleAutoPlay());
    await page.waitForFunction(() => window.__solitaire!.getSummary().gameWon);

    await expect(page.getByTestId('insights-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
    await expect(page.getByTestId('insights-progress-value')).toHaveText('100%');
    await expect(page.getByTestId('insights-stat-foundations')).toContainText(
      '52/52',
    );

    // Dismiss the win modal (keeps game state) and confirm the chart drew.
    await page.getByTestId('win-modal-close-btn').click();
    await expect(
      page.getByTestId('insights-chart-progress').locator('svg'),
    ).toBeVisible();
  });

  test('switches between the Progress and Card Flow tabs', async ({ page }) => {
    await page.goto('/?seed=42');
    await waitForGame(page);

    // A handful of draws gives the charts something to plot.
    await page.evaluate(() => {
      for (let i = 0; i < 20; i += 1) window.__solitaire!.draw();
    });

    // Progress is the default tab.
    await expect(page.getByTestId('insights-tab-progress')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      page.getByTestId('insights-chart-progress').locator('svg'),
    ).toBeVisible();

    // Switch to Card Flow.
    await page.getByTestId('insights-tab-flow').click();
    await expect(page.getByTestId('insights-tab-flow')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      page.getByTestId('insights-chart-flow').locator('svg'),
    ).toBeVisible();
    await expect(page.getByTestId('insights-chart-progress')).toHaveCount(0);
  });

  test('collapsing hides the charts but keeps the live bar', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await waitForGame(page);

    await page.getByTestId('insights-collapse-btn').click();

    // The live bar stays (its 0%-wide fill has no box on a fresh deal, so assert
    // the always-visible value label and that the bar element is still mounted).
    await expect(page.getByTestId('insights-progress-value')).toBeVisible();
    await expect(page.getByTestId('insights-progress-bar')).toHaveCount(1);
    await expect(page.getByTestId('insights-tab-progress')).toHaveCount(0);
    await expect(page.getByTestId('insights-chart-progress')).toHaveCount(0);

    // Expand again.
    await page.getByTestId('insights-collapse-btn').click();
    await expect(page.getByTestId('insights-tab-progress')).toBeVisible();
  });
});
