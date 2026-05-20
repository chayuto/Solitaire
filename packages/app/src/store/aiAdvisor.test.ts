/**
 * Integration tests for the AI Move Advisor store actions, driven through a
 * deterministic stub provider (no network, no API key).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from './gameStore';
import {
  AIError,
  clearAIInteractions,
  createStubProvider,
  getAIInteractions,
  getLastAIInteraction,
  recordAIInteraction,
  setProviderOverride,
  uuidv7,
} from '../ai';
import type { AIMoveDecision } from '../ai';
import type { Card, GameState, Rank, Suit } from '../types';
import { scenarios } from '../testScenarios';

/** Install a stub provider that returns `decision`. */
function useStub(decision: AIMoveDecision | (() => never)): void {
  if (typeof decision === 'function') {
    setProviderOverride(createStubProvider(decision));
  } else {
    setProviderOverride(createStubProvider(() => decision));
  }
}

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

/**
 * A board whose only legal move is to draw from the stock. Each of the seven
 * tableau columns is topped with a distinct non-ace club: black never stacks on
 * black, and with empty foundations no ace play exists either — so no tableau
 * move is legal. Every other card sits in the stock.
 */
function forcedDrawBoard(): Partial<GameState> {
  const topRanks: Rank[] = ['2', '3', '4', '5', '6', '7', '8'];
  const topIds = new Set(topRanks.map((r) => `clubs-${r}`));
  const tableau = topRanks.map((r) => [
    { suit: 'clubs', rank: r, faceUp: true, id: `clubs-${r}` } as Card,
  ]);
  const drawPile: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const id = `${suit}-${rank}`;
      if (!topIds.has(id)) drawPile.push({ suit, rank, faceUp: false, id });
    }
  }
  return {
    drawPile,
    discardPile: [],
    foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
    tableau,
    moveHistory: [],
    gameWon: false,
    completionProgress: 0,
  };
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

  it('logs the interaction and records boardAnalysis + requestId on the decision', async () => {
    clearAIInteractions();
    useStub({
      boardAnalysis: 'Two aces are buried in column 5.',
      moveIndex: 0,
      reasoning: 'Draw to dig toward the aces.',
      confidence: 0.6,
    });

    await useGameStore.getState().askAIForMove();

    const decision = useGameStore.getState().aiDecisionLog?.[0];
    expect(decision?.boardAnalysis).toBe('Two aces are buried in column 5.');
    expect(decision?.requestId).toBeTruthy();

    // The interaction log records the call under the same request id.
    const interactions = getAIInteractions();
    expect(interactions.length).toBeGreaterThanOrEqual(1);
    const last = interactions[interactions.length - 1];
    expect(last.requestId).toBe(decision?.requestId);
    expect(last.outcome).toBe('success');
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

  it('allows a few position repeats, then stops on a stuck loop', () => {
    useGameStore.setState({ aiAutoPlay: true, aiError: undefined });

    // The board does not change between calls, so the position recurs each
    // time. A few repeats are tolerated; eventually auto-play halts.
    let calls = 0;
    for (let i = 0; i < 12 && useGameStore.getState().aiAutoPlay; i++) {
      useGameStore.getState().continueAIAutoPlay();
      calls++;
    }

    expect(useGameStore.getState().aiAutoPlay).toBe(false);
    expect(useGameStore.getState().aiError).toMatch(/loop/i);
    // It did not stop on the very first repeat.
    expect(calls).toBeGreaterThan(1);
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

describe('forced-position auto-play', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame(3, 42);
    clearAIInteractions();
  });

  afterEach(() => {
    setProviderOverride(null);
  });

  it('auto-plays a forced position without calling the provider', async () => {
    // The stub throws if consulted — a forced position must never reach it.
    useStub(() => {
      throw new Error('provider must not run on a forced position');
    });
    useGameStore.setState(forcedDrawBoard());

    const before = useGameStore.getState().moveHistory.length;
    await useGameStore.getState().askAIForMove();
    const state = useGameStore.getState();

    expect(state.aiError).toBeUndefined(); // stub never threw => never called
    expect(state.moveHistory.length).toBeGreaterThan(before); // the move was applied
    expect(state.aiThinking).toBe(false);
  });

  it('logs a forced_move interaction so the move sequence stays complete', async () => {
    useStub(() => {
      throw new Error('provider must not run on a forced position');
    });
    useGameStore.setState(forcedDrawBoard());

    await useGameStore.getState().askAIForMove();

    const interactions = getAIInteractions();
    const last = interactions[interactions.length - 1];
    expect(last.event).toBe('forced_move');
    expect(last.outcome).toBe('success');
    expect(last.config).toBeDefined();
    expect(last.movesApplied?.length).toBeGreaterThan(0);
  });

  it('does not auto-play when more than one move is legal', async () => {
    // A fresh deal offers many moves — the provider must be consulted.
    useStub({ moveIndex: 0, reasoning: 'go', confidence: 0.6 });
    await useGameStore.getState().askAIForMove();

    const last = getAIInteractions().slice(-1)[0];
    expect(last.event).toBeUndefined(); // a real API call, not a forced_move
    expect(useGameStore.getState().aiDecisionLog).toHaveLength(1);
  });
});

describe('harvest instrumentation', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame(3, 42);
    clearAIInteractions();
  });

  afterEach(() => {
    setProviderOverride(null);
  });

  it('stamps the active AI config on every interaction', async () => {
    useStub({ moveIndex: 0, reasoning: 'go', confidence: 0.6 });
    await useGameStore.getState().askAIForMove();

    const last = getAIInteractions().slice(-1)[0];
    expect(last.config).toBeDefined();
    expect(last.config?.model).toBe(useGameStore.getState().aiConfig?.model);
    expect(last.config?.preset).toBe(useGameStore.getState().aiConfig?.preset);
  });

  it('records the move-history entry types a decision produced', async () => {
    useStub({ moveIndex: 0, reasoning: 'go', confidence: 0.6 });
    await useGameStore.getState().askAIForMove();

    const last = getAIInteractions().slice(-1)[0];
    expect(Array.isArray(last.movesApplied)).toBe(true);
    expect(last.movesApplied?.length).toBeGreaterThan(0);
  });
});

describe('AI auto-play stall terminator', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame(3, 42);
    clearAIInteractions();
  });

  afterEach(() => {
    setProviderOverride(null);
    if (useGameStore.getState().aiAutoPlay) {
      useGameStore.getState().toggleAIAutoPlay();
    }
  });

  /**
   * Drive `continueAIAutoPlay` for `iterations` cycles. Each iteration:
   *   - records a synthetic interaction tagged with `moveType` so the stall
   *     tracker reads the move type from the last interaction,
   *   - rotates the stock one card so the position hash is fresh (otherwise
   *     loop detection trips before the stall threshold is reached).
   *
   * Stops early if the store turned auto-play off (the terminator fired).
   */
  function driveFlatTurns(moveType: string, iterations: number): void {
    const sessionId = useGameStore.getState().gameSessionId ?? '';
    for (let i = 0; i < iterations && useGameStore.getState().aiAutoPlay; i++) {
      const dp = useGameStore.getState().drawPile;
      if (dp.length > 1) {
        useGameStore.setState({ drawPile: [...dp.slice(1), dp[0]] });
      }
      recordAIInteraction({
        id: uuidv7(),
        requestId: uuidv7(),
        sessionId,
        attempt: 1,
        timestamp: Date.now() + i,
        provider: 'stub',
        model: 'stub',
        outcome: 'success',
        durationMs: 0,
        prompt: '',
        movesApplied: [moveType],
      });
      useGameStore.getState().continueAIAutoPlay();
    }
  }

  it('stops auto-play on a long shuffle-dominated plateau (doom-loop)', () => {
    useStub({ moveIndex: 0, reasoning: 'go', confidence: 0.5 });
    useGameStore.setState({ aiAutoPlay: true, aiError: undefined });

    driveFlatTurns('tableau_to_tableau', 60);

    const state = useGameStore.getState();
    expect(state.aiAutoPlay).toBe(false);
    expect(state.aiError).toMatch(/no progress/i);
    expect(state.aiError).toMatch(/shuffle/i);
  });

  it('records a stall_terminated event with shuffle-fraction telemetry', () => {
    useStub({ moveIndex: 0, reasoning: 'go', confidence: 0.5 });
    useGameStore.setState({ aiAutoPlay: true, aiError: undefined });

    driveFlatTurns('tableau_to_tableau', 60);

    // Find the most recent stall_terminated interaction; production code stamps
    // shuffle fraction, plateau length, and the move-type window onto it.
    const stall = [...getAIInteractions()]
      .reverse()
      .find((entry) => entry.event === 'stall_terminated');
    expect(stall).toBeTruthy();
    expect(stall?.shuffleFraction).toBe(1);
    expect(stall?.plateauLength).toBeGreaterThanOrEqual(25);
    expect(stall?.moveTypeWindow?.every((mt) => mt === 'tableau_to_tableau')).toBe(true);
  });

  it('does NOT terminate a draw-dominated plateau (honest Ace-hunt)', () => {
    useStub({ moveIndex: 0, reasoning: 'go', confidence: 0.5 });
    useGameStore.setState({ aiAutoPlay: true, aiError: undefined });

    // 40 flat turns of pure information-gathering draws — well beyond the
    // plateau gate but with shuffle fraction 0. Must not fire.
    driveFlatTurns('draw_card', 40);

    expect(useGameStore.getState().aiAutoPlay).toBe(true);
    const stall = getAIInteractions().find((e) => e.event === 'stall_terminated');
    expect(stall).toBeUndefined();
  });

  it('marks the session outcome as stalled_auto_terminated after a doom-loop', () => {
    useStub({ moveIndex: 0, reasoning: 'go', confidence: 0.5 });
    useGameStore.setState({ aiAutoPlay: true, aiError: undefined });

    driveFlatTurns('tableau_to_tableau', 60);
    expect(useGameStore.getState().aiAutoPlay).toBe(false);

    const parsed = JSON.parse(useGameStore.getState().exportAIInteractions());
    expect(parsed.session.outcome).toBe('stalled_auto_terminated');
  });

  // Sanity: the previous interaction's movesApplied field is the source of
  // truth for the rolling window. If it is absent, the stall tracker must
  // still progress its counter (the plateau gate) and simply skip the push.
  it('tolerates an unstamped previous interaction without crashing', () => {
    useStub({ moveIndex: 0, reasoning: 'go', confidence: 0.5 });
    useGameStore.setState({ aiAutoPlay: true, aiError: undefined });

    const sessionId = useGameStore.getState().gameSessionId ?? '';
    for (let i = 0; i < 30 && useGameStore.getState().aiAutoPlay; i++) {
      const dp = useGameStore.getState().drawPile;
      if (dp.length > 1) {
        useGameStore.setState({ drawPile: [...dp.slice(1), dp[0]] });
      }
      // No movesApplied — simulates a leftover interaction with missing tags.
      recordAIInteraction({
        id: uuidv7(),
        requestId: uuidv7(),
        sessionId,
        attempt: 1,
        timestamp: Date.now() + i,
        provider: 'stub',
        model: 'stub',
        outcome: 'success',
        durationMs: 0,
        prompt: '',
      });
      useGameStore.getState().continueAIAutoPlay();
    }

    // The plateau gate is satisfied, but no shuffle entries got into the
    // window, so the second gate fails and termination does not fire.
    expect(useGameStore.getState().aiAutoPlay).toBe(true);
    expect(getLastAIInteraction()?.event).not.toBe('stall_terminated');
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

describe('heuristic auto-complete vs AI play', () => {
  afterEach(() => {
    useGameStore.setState({ autoPlayEnabled: false, aiAutoPlay: false, aiThinking: false });
  });

  it('does not let heuristic auto-complete hijack an AI-driven game', () => {
    // An auto-completable board; without AI activity the heuristic engages.
    useGameStore.getState().importGameState(JSON.stringify(scenarios.autoCompleteReady()));
    useGameStore.setState({ aiAutoPlay: false, aiThinking: false });
    useGameStore.getState().checkAndTriggerAutoComplete();
    expect(useGameStore.getState().autoPlayEnabled).toBe(true);

    // With AI play in progress, the heuristic must stand down.
    useGameStore.getState().importGameState(JSON.stringify(scenarios.autoCompleteReady()));
    useGameStore.setState({ autoPlayEnabled: false, aiAutoPlay: true });
    useGameStore.getState().checkAndTriggerAutoComplete();
    expect(useGameStore.getState().autoPlayEnabled).toBe(false);

    useGameStore.setState({ aiAutoPlay: false, aiThinking: true });
    useGameStore.getState().checkAndTriggerAutoComplete();
    expect(useGameStore.getState().autoPlayEnabled).toBe(false);
  });
});

describe('game session metadata', () => {
  it('assigns a fresh UUIDv7 session id per game', () => {
    useGameStore.getState().initializeGame(3, 42);
    const first = useGameStore.getState().gameSessionId;
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof useGameStore.getState().gameStartedAt).toBe('number');

    useGameStore.getState().initializeGame(3, 42);
    expect(useGameStore.getState().gameSessionId).not.toBe(first);
  });
});
