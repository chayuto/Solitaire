/**
 * Integration tests for the AI Move Advisor store actions, driven through a
 * deterministic stub provider (no network, no API key).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from './gameStore';
import { AIError, createStubProvider, setProviderOverride } from '../ai';
import type { AIMoveDecision } from '../ai';

/** Install a stub provider that returns `decision`. */
function useStub(decision: AIMoveDecision | (() => never)): void {
  if (typeof decision === 'function') {
    setProviderOverride(createStubProvider(decision));
  } else {
    setProviderOverride(createStubProvider(() => decision));
  }
}

describe('AI Move Advisor store actions', () => {
  beforeEach(() => {
    // Deterministic, reproducible deal.
    useGameStore.getState().initializeGame(3, 42);
  });

  afterEach(() => {
    setProviderOverride(null);
  });

  it('applies the AI-chosen move and records the decision', async () => {
    useStub({ moveIndex: 0, reasoning: 'Open the game by drawing.', confidence: 0.8 });

    const before = useGameStore.getState().moveHistory.length;
    await useGameStore.getState().askAIForMove();
    const state = useGameStore.getState();

    expect(state.moveHistory.length).toBeGreaterThan(before);
    expect(state.aiThinking).toBe(false);
    expect(state.aiError).toBeUndefined();
    expect(state.aiDecisionLog).toHaveLength(1);
    expect(state.aiDecisionLog?.[0].reasoning).toBe('Open the game by drawing.');
    expect(state.aiDecisionLog?.[0].confidence).toBeCloseTo(0.8);
  });

  it('annotates the resulting move-history entry with the reasoning', async () => {
    useStub({ moveIndex: 0, reasoning: 'Strategic draw.', confidence: 0.7 });

    const before = useGameStore.getState().moveHistory.length;
    await useGameStore.getState().askAIForMove();

    const newEntry = useGameStore.getState().moveHistory[before];
    expect(newEntry.aiReasoning).toBe('Strategic draw.');
    expect(newEntry.aiConfidence).toBeCloseTo(0.7);
  });

  it('records an error and applies no move when the provider fails', async () => {
    useStub(() => {
      throw new Error('model exploded');
    });

    const before = useGameStore.getState().moveHistory.length;
    await useGameStore.getState().askAIForMove();
    const state = useGameStore.getState();

    expect(state.aiError).toContain('model exploded');
    expect(state.aiThinking).toBe(false);
    expect(state.moveHistory.length).toBe(before);
    expect(state.aiDecisionLog ?? []).toHaveLength(0);
  });

  it('rejects an out-of-range move index without touching the board', async () => {
    useStub({ moveIndex: 999, reasoning: 'invalid', confidence: 1 });

    const before = useGameStore.getState().moveHistory.length;
    await useGameStore.getState().askAIForMove();
    const state = useGameStore.getState();

    expect(state.aiError).toBeTruthy();
    expect(state.moveHistory.length).toBe(before);
  });

  it('clears the thinking flag after completing', async () => {
    useStub({ moveIndex: 0, reasoning: 'go', confidence: 0.5 });
    await useGameStore.getState().askAIForMove();
    expect(useGameStore.getState().aiThinking).toBe(false);
    expect(useGameStore.getState().aiThinkingSince).toBeUndefined();
  });

  it('clearAIError clears the last error', async () => {
    useStub(() => {
      throw new Error('boom');
    });
    await useGameStore.getState().askAIForMove();
    expect(useGameStore.getState().aiError).toBeTruthy();

    useGameStore.getState().clearAIError();
    expect(useGameStore.getState().aiError).toBeUndefined();
  });
});

describe('AI auto-play', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame(3, 42);
  });

  afterEach(() => {
    setProviderOverride(null);
    // Ensure no auto-play loop leaks into the next test.
    if (useGameStore.getState().aiAutoPlay) {
      useGameStore.getState().toggleAIAutoPlay();
    }
  });

  it('engages and disengages auto-play', () => {
    useStub({ moveIndex: 0, reasoning: 'go', confidence: 0.5 });

    useGameStore.getState().toggleAIAutoPlay();
    expect(useGameStore.getState().aiAutoPlay).toBe(true);

    useGameStore.getState().toggleAIAutoPlay();
    expect(useGameStore.getState().aiAutoPlay).toBe(false);
  });

  it('refuses to start once the game is won', () => {
    useGameStore.setState({ gameWon: true });
    useGameStore.getState().toggleAIAutoPlay();
    expect(useGameStore.getState().aiAutoPlay).toBeFalsy();
    expect(useGameStore.getState().aiError).toBeTruthy();
  });

  it('stops and flags a loop when the board position repeats', () => {
    useGameStore.setState({ aiAutoPlay: true, aiError: undefined });
    const store = useGameStore.getState();

    // First call records the position; a second call on the same position
    // detects the repeat. (If the hash was already seen, the first call
    // detects it — either way auto-play halts with a loop error.)
    store.continueAIAutoPlay();
    if (useGameStore.getState().aiAutoPlay) {
      store.continueAIAutoPlay();
    }

    expect(useGameStore.getState().aiAutoPlay).toBe(false);
    expect(useGameStore.getState().aiError).toMatch(/loop/i);
  });

  it('stops auto-play when a non-transient provider error occurs', async () => {
    useStub(() => {
      throw new AIError('invalid_key', 'bad key');
    });
    useGameStore.setState({ aiAutoPlay: true });
    await useGameStore.getState().askAIForMove();

    expect(useGameStore.getState().aiAutoPlay).toBe(false);
    expect(useGameStore.getState().aiError).toContain('bad key');
  });

  it('keeps auto-play going through a transient error', async () => {
    vi.useFakeTimers();
    useStub(() => {
      throw new AIError('unavailable', 'Gemini temporarily unavailable.');
    });
    useGameStore.setState({ aiAutoPlay: true });

    const promise = useGameStore.getState().askAIForMove();
    // Advance past the in-call retry backoffs (~15s) but not as far as the
    // auto-play re-attempt cooldown (~12s after the failure), so we observe
    // the post-failure state cleanly.
    await vi.advanceTimersByTimeAsync(20_000);
    await promise;

    // A transient failure must NOT stop auto-play: it schedules a re-attempt.
    expect(useGameStore.getState().aiAutoPlay).toBe(true);
    expect(useGameStore.getState().aiError).toMatch(/retr/i);

    vi.useRealTimers();
    useGameStore.getState().toggleAIAutoPlay(); // stop the loop + pending timer
  });
});

describe('setAIConfig', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame(3, 42);
  });

  it('applies a named preset bundle', () => {
    useGameStore.getState().setAIConfig({ preset: 'minimal' });
    const config = useGameStore.getState().aiConfig!;
    expect(config.preset).toBe('minimal');
    expect(config.includeMoveHistory).toBe(false);
    expect(config.includeGameMetrics).toBe(false);
  });

  it('switches to the custom preset when a toggle is changed directly', () => {
    useGameStore.getState().setAIConfig({ preset: 'standard' });
    useGameStore.getState().setAIConfig({ includeHeuristicScores: true });
    const config = useGameStore.getState().aiConfig!;
    expect(config.preset).toBe('custom');
    expect(config.includeHeuristicScores).toBe(true);
  });

  it('keeps provider, model and seeHiddenCards when applying a preset', () => {
    useGameStore.getState().setAIConfig({ model: 'gemini-3.1-flash-lite', seeHiddenCards: true });
    useGameStore.getState().setAIConfig({ preset: 'detailed' });
    const config = useGameStore.getState().aiConfig!;
    expect(config.model).toBe('gemini-3.1-flash-lite');
    expect(config.seeHiddenCards).toBe(true);
  });

  it('preserves the AI config across a new game', () => {
    useGameStore.getState().setAIConfig({ model: 'gemma-4-26b-a4b-it' });
    useGameStore.getState().initializeGame(2);
    expect(useGameStore.getState().aiConfig?.model).toBe('gemma-4-26b-a4b-it');
  });
});
