import { test, expect } from '@playwright/test';
import { waitForGame, summary } from './helpers';

/**
 * E2E coverage for the AI Move Advisor.
 *
 * Every test installs a deterministic provider stub via the test bridge
 * (`setAIProviderStub`), so these tests never make a network call and never
 * need a real API key.
 */
test.describe('AI Move Advisor', () => {
  test('renders the AI advisor panel and Ask AI button', async ({ page }) => {
    await page.goto('/?seed=1');
    await waitForGame(page);

    await expect(page.getByTestId('ai-advisor-panel')).toBeVisible();
    await expect(page.getByTestId('ask-ai-btn')).toBeVisible();
    // The title shows a short game id for traceability.
    await expect(page.getByTestId('game-id')).toContainText('Game #');
  });

  test('asks the AI, applies the chosen move, and logs the reasoning', async ({ page }) => {
    // seed=7 is known to open with >1 legal move, so the AI is consulted
    // rather than the position being auto-played as a forced single move.
    await page.goto('/?seed=7');
    await waitForGame(page);

    // Install a stub that always picks the first legal move.
    await page.evaluate(() => {
      window.__solitaire!.setAIProviderStub(() => ({
        moveIndex: 0,
        reasoning: 'E2E stub: opening the game.',
        confidence: 0.83,
      }));
    });

    const before = (await summary(page)).moveCount;
    await page.getByTestId('ask-ai-btn').click();

    // Wait for the decision to be recorded.
    await page.waitForFunction(() => window.__solitaire!.getAIState().decisionCount === 1);

    // A move was applied.
    expect((await summary(page)).moveCount).toBeGreaterThan(before);

    // The advisor panel shows the decision + reasoning.
    await expect(page.getByTestId('ai-last-decision')).toBeVisible();
    await expect(page.getByTestId('ai-reasoning')).toContainText('opening the game');

    // The activity log surfaces the AI reasoning on the move entry. Use a
    // text filter rather than .first(): an AI move that flips a card renders
    // a consequence entry (with no reasoning) ahead of the lead entry, so the
    // first activity-log-ai-reasoning element is empty.
    await expect(
      page.getByTestId('activity-log-ai-reasoning').filter({ hasText: 'opening the game' }),
    ).toBeVisible();

    // No error, not stuck thinking.
    const ai = await page.evaluate(() => window.__solitaire!.getAIState());
    expect(ai.thinking).toBe(false);
    expect(ai.error).toBeNull();
  });

  test('surfaces a provider error in the advisor panel', async ({ page }) => {
    await page.goto('/?seed=7');
    await waitForGame(page);

    await page.evaluate(() => {
      window.__solitaire!.setAIProviderStub(() => {
        throw new Error('E2E stub failure');
      });
    });

    const before = (await summary(page)).moveCount;
    await page.getByTestId('ask-ai-btn').click();

    await page.waitForFunction(() => window.__solitaire!.getAIState().error !== null);

    await expect(page.getByTestId('ai-error')).toContainText('E2E stub failure');
    // The board is untouched on failure.
    expect((await summary(page)).moveCount).toBe(before);
  });

  test('opens and closes the API key modal', async ({ page }) => {
    await page.goto('/?seed=1');
    await waitForGame(page);

    await page.getByTestId('ai-settings-toggle-btn').click();
    await page.getByTestId('ai-key-settings-btn').click();

    await expect(page.getByTestId('ai-key-modal')).toBeVisible();
    await expect(page.getByTestId('ai-model-input')).toBeVisible();

    await page.getByTestId('ai-key-modal-close-btn').click();
    await expect(page.getByTestId('ai-key-modal')).toBeHidden();
  });

  test('applies a context preset chosen in AI settings', async ({ page }) => {
    await page.goto('/?seed=1');
    await waitForGame(page);

    await page.getByTestId('ai-settings-toggle-btn').click();
    await page.getByTestId('ai-preset-select').selectOption('minimal');

    const ai = await page.evaluate(() => window.__solitaire!.getAIState());
    expect(ai.preset).toBe('minimal');
  });

  test('AI auto-play keeps making moves until stopped', async ({ page }) => {
    await page.goto('/?seed=1');
    await waitForGame(page);

    await page.evaluate(() => {
      window.__solitaire!.setAIProviderStub(() => ({
        moveIndex: 0,
        reasoning: 'E2E stub: auto-play move.',
        confidence: 0.5,
      }));
    });

    // Start auto-play.
    await page.getByTestId('ai-auto-play-btn').click();
    await expect(page.getByTestId('ai-auto-badge')).toBeVisible();

    // It keeps playing move after move on its own.
    await page.waitForFunction(() => window.__solitaire!.getAIState().decisionCount >= 3, null, {
      timeout: 15000,
    });
    expect(await page.evaluate(() => window.__solitaire!.getAIState().autoPlay)).toBe(true);

    // Stop it.
    await page.getByTestId('ai-auto-play-btn').click();
    await expect(page.getByTestId('ai-auto-badge')).toBeHidden();
    expect(await page.evaluate(() => window.__solitaire!.getAIState().autoPlay)).toBe(false);

    // Every auto-play move is logged with its AI reasoning.
    expect(await page.getByTestId('activity-log-ai-reasoning').count()).toBeGreaterThanOrEqual(2);
  });

  test('exports the AI decision log, seed and config for repeatability', async ({ page }) => {
    await page.goto('/?seed=7');
    await waitForGame(page);

    await page.evaluate(() => {
      window.__solitaire!.setAIProviderStub(() => ({
        moveIndex: 0,
        reasoning: 'E2E stub: export-log check.',
        confidence: 0.6,
      }));
    });
    await page.getByTestId('ask-ai-btn').click();
    await page.waitForFunction(() => window.__solitaire!.getAIState().decisionCount === 1);

    const exported = JSON.parse(
      await page.evaluate(() => window.__solitaire!.exportState()),
    );
    expect(exported.seed).toBe(7);
    expect(exported.gameSessionId).toBeTruthy();
    expect(exported.appCommit).toBeTruthy();
    expect(exported.aiConfig?.model).toBeTruthy();
    expect(exported.aiDecisionLog).toHaveLength(1);
    expect(exported.aiDecisionLog[0].reasoning).toContain('export-log check');
    const aiMove = exported.moveHistory.find(
      (m: { aiReasoning?: string }) => m.aiReasoning,
    );
    expect(aiMove?.aiReasoning).toContain('export-log check');
  });

  test('logs LLM interactions with prompts, ids and an export', async ({ page }) => {
    await page.goto('/?seed=7');
    await waitForGame(page);

    await page.evaluate(() => {
      window.__solitaire!.setAIProviderStub(() => ({
        boardAnalysis: 'E2E stub: board analysis.',
        moveIndex: 0,
        reasoning: 'E2E stub: strategic plan.',
        confidence: 1,
      }));
    });
    await page.getByTestId('ask-ai-btn').click();
    await page.waitForFunction(() => window.__solitaire!.getAIState().decisionCount === 1);

    const interactions = await page.evaluate(() => window.__solitaire!.getAIInteractions());
    expect(interactions.length).toBeGreaterThanOrEqual(1);
    const last = interactions[interactions.length - 1];
    expect(last.outcome).toBe('success');
    expect(last.requestId).toBeTruthy();
    expect(last.id).toBeTruthy();
    expect(last.prompt.length).toBeGreaterThan(0);
    // The interaction is tagged with the game session id and turn metadata.
    const sessionId = await page.evaluate(() => window.__solitaire!.getSummary().gameSessionId);
    expect(last.sessionId).toBe(sessionId);
    expect(typeof last.turnIndex).toBe('number');

    // The interaction log exports as JSON for harvesting.
    const exported = JSON.parse(
      await page.evaluate(() => window.__solitaire!.exportAIInteractions()),
    );
    expect(exported.count).toBeGreaterThanOrEqual(1);
    expect(exported.interactions[0].requestId).toBeTruthy();
    expect(exported.appCommit).toBeTruthy();
    expect(exported.interactions[0].appCommit).toBeTruthy();
  });

  test('replay surfaces which moves were made by the AI', async ({ page }) => {
    await page.goto('/?seed=7');
    await waitForGame(page);

    await page.evaluate(() => {
      window.__solitaire!.setAIProviderStub(() => ({
        moveIndex: 0,
        reasoning: 'E2E stub: replay reasoning.',
        confidence: 0.7,
      }));
    });
    await page.getByTestId('ask-ai-btn').click();
    await page.waitForFunction(() => window.__solitaire!.getAIState().decisionCount === 1);

    await page.getByTestId('replay-btn').click();
    await page.getByTestId('replay-forward-btn').click();

    await expect(page.getByTestId('replay-current-move')).toBeVisible();
    await expect(page.getByTestId('replay-ai-reasoning')).toContainText('replay reasoning');
  });

  test('respects the chosen move index from the stub', async ({ page }) => {
    await page.goto('/?seed=7');
    await waitForGame(page);

    // Pick the last legal move rather than the first.
    await page.evaluate(() => {
      window.__solitaire!.setAIProviderStub((ctx) => ({
        moveIndex: ctx.legalMoves.length - 1,
        reasoning: 'E2E stub: chose the last legal move.',
        confidence: 0.5,
      }));
    });

    await page.getByTestId('ask-ai-btn').click();
    await page.waitForFunction(() => window.__solitaire!.getAIState().decisionCount === 1);

    const ai = await page.evaluate(() => window.__solitaire!.getAIState());
    expect(ai.lastDecision?.reasoning).toContain('last legal move');
  });
});
