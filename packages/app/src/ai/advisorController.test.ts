/**
 * Controller-level tests for run-state ownership — the piece that was
 * untestable when this state lived at the store's module scope.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '@chayuto/solitaire-core';
import { createAdvisorController, type AdvisorStore } from './advisorController';
import type { GameState } from '../types';

const engine = new GameEngine();

/** Minimal playable state: one legal move (draw) so askForMove is exercisable. */
function makeState(): GameState {
  const core = engine.initialize({ difficulty: 3, seed: 7 });
  return {
    ...core,
    drawPile: [...core.drawPile],
    discardPile: [...core.discardPile],
    foundations: {
      hearts: [...core.foundations.hearts],
      diamonds: [...core.foundations.diamonds],
      clubs: [...core.foundations.clubs],
      spades: [...core.foundations.spades],
    },
    tableau: core.tableau.map((c) => [...c]),
    moveHistory: [],
    eventLog: [],
    showValidMoves: false,
    godMode: false,
    autoPlayEnabled: false,
    autoPlayInProgress: false,
    replayMode: false,
    replayIndex: 0,
    replayPaused: false,
    replaySpeed: 1000,
    aiAutoPlay: false,
    aiThinking: false,
  } as GameState;
}

function makeHarness() {
  let state = { ...makeState(), applyMoveCommand: vi.fn() } as AdvisorStore;
  const set = vi.fn((partial: Partial<GameState>) => {
    state = { ...state, ...partial };
  });
  const get = () => state;
  const controller = createAdvisorController({ get, set, engine });
  return { controller, get, set, mutate: (p: Partial<GameState>) => (state = { ...state, ...p }) };
}

describe('advisorController.resetRunState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears a scheduled auto-play turn so it never fires after reset', () => {
    const { controller, get, mutate } = makeHarness();
    mutate({ aiAutoPlay: true });

    // Schedules the next turn via setTimeout.
    controller.continueAutoPlay();
    expect(vi.getTimerCount()).toBe(1);

    controller.resetRunState();
    expect(vi.getTimerCount()).toBe(0);

    // Belt and braces: advancing time fires nothing.
    vi.runAllTimers();
    expect(get().aiThinking).toBe(false);
  });

  it('resets the stall flag', () => {
    const { controller } = makeHarness();
    expect(controller.wasStalled()).toBe(false);
    controller.resetRunState();
    expect(controller.wasStalled()).toBe(false);
  });

  it('stopping auto-play cancels the scheduled next turn', () => {
    const { controller, mutate } = makeHarness();
    mutate({ aiAutoPlay: true });
    controller.continueAutoPlay();
    expect(vi.getTimerCount()).toBe(1);

    // Toggle while running = stop.
    controller.toggleAutoPlay();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('with no API key, starting auto-play prompts for a key and disarms', () => {
    const { controller, get } = makeHarness();

    // toggleAutoPlay arms auto-play and immediately asks for a move; the
    // synchronous no-key guard inside askForMove opens the key modal and
    // disarms so an unconfigured user is never left in a phantom run.
    controller.toggleAutoPlay();

    expect(get().aiKeyModalOpen).toBe(true);
    expect(get().aiAutoPlay).toBe(false);
    expect(get().aiError).toBeUndefined();
  });
});
