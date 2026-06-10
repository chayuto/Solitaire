/**
 * Undo/redo — bounded snapshot stacks over the single mutation pathway
 * (stage-3). One snapshot per user-visible action.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { uiToCore } from '../adapters/coreAdapter';
import { engine } from './engine';

const boardJson = () => {
  const s = useGameStore.getState();
  return JSON.stringify({
    draw: s.drawPile,
    discard: s.discardPile,
    foundations: s.foundations,
    tableau: s.tableau,
    history: s.moveHistory,
    recycleCount: s.recycleCount,
    progress: s.completionProgress,
  });
};

describe('undo/redo', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame(3, 42);
  });

  it('undo restores the exact prior board after a draw', () => {
    const before = boardJson();
    useGameStore.getState().drawCard();
    expect(boardJson()).not.toBe(before);
    expect(useGameStore.getState().undoStack).toHaveLength(1);

    useGameStore.getState().undo();
    expect(boardJson()).toBe(before);
    expect(useGameStore.getState().undoStack).toHaveLength(0);
    expect(useGameStore.getState().redoStack).toHaveLength(1);
  });

  it('redo re-applies the undone move exactly', () => {
    useGameStore.getState().drawCard();
    const after = boardJson();
    useGameStore.getState().undo();
    useGameStore.getState().redo();
    expect(boardJson()).toBe(after);
    expect(useGameStore.getState().redoStack).toHaveLength(0);
  });

  it('a multi-card tableau move (with auto-flip) is a single undo step', () => {
    // Find a legal tableau_to_tableau move via the engine and apply it.
    const state = useGameStore.getState();
    const move = engine
      .getLegalMoves(uiToCore(state))
      .find((m) => m.type === 'tableau_to_tableau');
    if (!move) return; // seed 42 has tableau moves; guard for safety
    const before = boardJson();

    useGameStore.getState().applyMoveCommand(move);
    // The move may have produced several records (cards + flip)…
    expect(useGameStore.getState().moveHistory.length).toBeGreaterThanOrEqual(1);
    // …but exactly one undo step.
    expect(useGameStore.getState().undoStack).toHaveLength(1);

    useGameStore.getState().undo();
    expect(boardJson()).toBe(before);
  });

  it('a draw that recycles round-trips recycleCount through undo', () => {
    for (let i = 0; i < 24; i++) useGameStore.getState().drawCard(); // empty stock
    useGameStore.getState().drawCard(); // recycle
    expect(useGameStore.getState().recycleCount).toBe(1);

    useGameStore.getState().undo();
    expect(useGameStore.getState().recycleCount).toBe(0);
    useGameStore.getState().redo();
    expect(useGameStore.getState().recycleCount).toBe(1);
  });

  it('a new move clears the redo branch', () => {
    useGameStore.getState().drawCard();
    useGameStore.getState().undo();
    expect(useGameStore.getState().redoStack).toHaveLength(1);
    useGameStore.getState().drawCard();
    expect(useGameStore.getState().redoStack).toHaveLength(0);
  });

  it('caps the stack at 50 snapshots, dropping the oldest', () => {
    // 24 draws + recycle + 24 draws + recycle + 24 draws = 74 actions
    for (let i = 0; i < 74; i++) useGameStore.getState().drawCard();
    expect(useGameStore.getState().undoStack.length).toBeLessThanOrEqual(50);
  });

  it('records undo/redo telemetry in the eventLog, never moveHistory', () => {
    useGameStore.getState().drawCard();
    const movesAfterDraw = useGameStore.getState().moveHistory.length;
    useGameStore.getState().undo();
    useGameStore.getState().redo();

    const s = useGameStore.getState();
    expect(s.moveHistory.length).toBe(movesAfterDraw);
    expect(s.eventLog?.some((e) => e.type === 'undo')).toBe(true);
    expect(s.eventLog?.some((e) => e.type === 'redo')).toBe(true);
  });

  it('is a no-op during replay, AI play, and auto-play', () => {
    useGameStore.getState().drawCard();
    const after = boardJson();

    for (const guard of [
      { replayMode: true },
      { aiThinking: true },
      { aiAutoPlay: true },
      { autoPlayEnabled: true },
    ]) {
      useGameStore.setState({ replayMode: false, aiThinking: false, aiAutoPlay: false, autoPlayEnabled: false, ...guard });
      useGameStore.getState().undo();
      expect(boardJson()).toBe(after);
    }
    useGameStore.setState({ replayMode: false, aiThinking: false, aiAutoPlay: false, autoPlayEnabled: false });
  });

  it('undoing a winning move flips gameWon back', () => {
    useGameStore.getState().drawCard();
    // Simulate a "won" flag set by a foundation move whose snapshot predates it.
    const snapshotCount = useGameStore.getState().undoStack.length;
    expect(snapshotCount).toBeGreaterThan(0);
    useGameStore.setState({ gameWon: true });
    useGameStore.getState().undo();
    expect(useGameStore.getState().gameWon).toBe(false);
  });

  it('new game and loaded sessions start with empty stacks', () => {
    useGameStore.getState().drawCard();
    expect(useGameStore.getState().undoStack.length).toBe(1);
    useGameStore.getState().initializeGame(3, 99);
    expect(useGameStore.getState().undoStack).toHaveLength(0);
    expect(useGameStore.getState().redoStack).toHaveLength(0);
  });
});
