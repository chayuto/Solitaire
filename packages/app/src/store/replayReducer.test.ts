/**
 * Direct tests for the record-level replay reducer — previously unreachable
 * logic embedded in the goToReplayIndex action.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { replayBoardAt } from './replayReducer';

describe('replayBoardAt', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame(3, 42);
  });

  /** Play a deterministic seeded prefix through the real store. */
  function playMoves(count: number): void {
    const store = useGameStore.getState();
    for (let i = 0; i < count; i++) {
      const s = useGameStore.getState();
      // Drive with draws (always legal on this seed within the prefix) and
      // any foundation/tableau move the engine offers first.
      store.drawCard();
      void s;
    }
  }

  it('index 0 reproduces the initial deal', () => {
    playMoves(3);
    const state = useGameStore.getState();
    const board = replayBoardAt(state.initialBoardSetup!, state.moveHistory, 0);

    expect(board.drawPile).toEqual(state.initialBoardSetup!.drawPile);
    expect(board.tableau).toEqual(state.initialBoardSetup!.tableau);
    expect(board.recycleCount).toBe(0);
  });

  it('replaying the full history reproduces the live board', () => {
    playMoves(5);
    const state = useGameStore.getState();
    const board = replayBoardAt(
      state.initialBoardSetup!,
      state.moveHistory,
      state.moveHistory.length,
    );

    expect(board.drawPile).toEqual(state.drawPile);
    expect(board.discardPile).toEqual(state.discardPile);
    expect(board.foundations).toEqual(state.foundations);
    expect(board.tableau).toEqual(state.tableau);
    expect(board.recycleCount).toBe(state.recycleCount ?? 0);
  });

  it('replays an explicit recycle_stock record and counts the cycle', () => {
    // Cycle the entire stock: 24 draws empties it, the next drawCard recycles.
    playMoves(24);
    useGameStore.getState().drawCard(); // recycle
    useGameStore.getState().drawCard(); // first draw of cycle 2

    const state = useGameStore.getState();
    expect(state.recycleCount).toBe(1);

    const board = replayBoardAt(
      state.initialBoardSetup!,
      state.moveHistory,
      state.moveHistory.length,
    );
    expect(board.recycleCount).toBe(1);
    expect(board.drawPile).toEqual(state.drawPile);
    expect(board.discardPile).toEqual(state.discardPile);
  });

  it('does not mutate the initial board setup it replays from', () => {
    playMoves(4);
    const state = useGameStore.getState();
    const before = JSON.stringify(state.initialBoardSetup);
    replayBoardAt(state.initialBoardSetup!, state.moveHistory, state.moveHistory.length);
    expect(JSON.stringify(state.initialBoardSetup)).toBe(before);
  });
});
