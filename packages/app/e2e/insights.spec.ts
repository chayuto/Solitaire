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
      page.getByTestId('insights-chart-progress').locator('canvas'),
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
      page.getByTestId('insights-chart-progress').locator('canvas'),
    ).toBeVisible();

    // Switch to Card Flow.
    await page.getByTestId('insights-tab-flow').click();
    await expect(page.getByTestId('insights-tab-flow')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      page.getByTestId('insights-chart-flow').locator('canvas'),
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

/**
 * The "stat nerd" additions: the always-visible box-score strip, the Board
 * topology tab, and the AI telemetry tab.
 */
test.describe('Game Insights — stats, board & AI', () => {
  test('shows the box-score stat strip on a fresh deal', async ({ page }) => {
    await page.goto('/?seed=42');
    await waitForGame(page);

    await expect(page.getByTestId('insights-stat-strip')).toBeVisible();
    await expect(page.getByTestId('insights-stat-time')).toContainText('0:');
    await expect(page.getByTestId('insights-stat-pace')).toContainText('moves/min');
    await expect(page.getByTestId('insights-stat-recycles')).toContainText(
      '0 recycles',
    );
    // No moves yet → efficiency is a dash, and the stuck-o-meter reads "flowing".
    await expect(page.getByTestId('insights-stat-efficiency')).toContainText('—');
    await expect(page.getByTestId('insights-stat-stuck')).toContainText('flowing');
  });

  test('updates the stat strip after a run of unproductive draws', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await waitForGame(page);

    await page.evaluate(() => {
      for (let i = 0; i < 12; i += 1) window.__solitaire!.draw();
    });

    // Drawing never reveals a tableau card or banks one → 0% efficient and the
    // stuck-o-meter is climbing.
    await expect(page.getByTestId('insights-stat-efficiency')).toContainText(
      '0% efficient',
    );
    await expect(page.getByTestId('insights-stat-stuck')).toContainText(
      'since gain',
    );
  });

  test('Board tab renders the foundation and tableau bars', async ({ page }) => {
    await page.goto('/?seed=42');
    await waitForGame(page);

    await page.getByTestId('insights-tab-board').click();
    await expect(page.getByTestId('insights-tab-board')).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await expect(page.getByTestId('insights-board-bars')).toBeVisible();

    // Four foundations, all empty on a fresh deal.
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs']) {
      await expect(page.getByTestId(`insights-foundation-${suit}`)).toHaveAttribute(
        'aria-label',
        `${suit} foundation: 0 of 13`,
      );
    }

    // Seven tableau columns; the last holds 7 cards with 6 face-down.
    await expect(page.getByTestId('insights-column-0')).toBeVisible();
    await expect(page.getByTestId('insights-column-6')).toHaveAttribute(
      'aria-label',
      'Column 7: 7 cards, 6 face-down',
    );
  });

  test('AI tab shows the empty state when no model has played', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await waitForGame(page);

    await page.getByTestId('insights-tab-ai').click();
    await expect(page.getByTestId('insights-tab-ai')).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Seeded play makes no real AI calls, so the telemetry stays empty.
    await expect(page.getByTestId('insights-ai-empty')).toBeVisible();
    await expect(page.getByTestId('insights-ai-stats')).toHaveCount(0);
  });

  test('stays responsive on a long game — both canvas charts still render at scale', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await waitForGame(page);

    // Drive a long game: hundreds of draws at the scale that froze the old SVG
    // charts. The ECharts canvas charts render the full-resolution series, so
    // this must not crash or hang.
    await page.evaluate(() => {
      for (let i = 0; i < 240; i += 1) window.__solitaire!.draw();
    });

    const movesText = await page.getByTestId('insights-stat-moves').textContent();
    const moves = Number.parseInt(movesText ?? '0', 10);
    expect(moves).toBeGreaterThan(160);

    // Progress chart draws to a <canvas>.
    await expect(
      page.getByTestId('insights-chart-progress').locator('canvas'),
    ).toBeVisible();

    // And so does the streamgraph.
    await page.getByTestId('insights-tab-flow').click();
    await expect(
      page.getByTestId('insights-chart-flow').locator('canvas'),
    ).toBeVisible();
  });
});
