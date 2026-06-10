/**
 * useProgressHistory — a live, per-move time-series of game progress.
 *
 * Solitaire's store keeps a flat `moveHistory` but never snapshots the *board
 * shape* at each move, so there is nothing to chart over time. This hook
 * subscribes to the store and accumulates one lightweight snapshot per move:
 * where the 52 cards sit (stock / waste / face-down / face-up / foundations)
 * plus the blended progress score. It feeds the Game Insights charts and
 * updates live as the AI auto-plays — the "fish bowl" effect.
 *
 * Lifecycle:
 *  - resets to a single baseline point whenever a new game starts (the
 *    `gameSessionId` changes — new deal, import, or scenario load);
 *  - appends a point each time `moveHistory` grows;
 *  - trims trailing points if `moveHistory` shrinks (undo / replay rewind).
 *
 * @module hooks/useProgressHistory
 */

import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { computeProgressComponents } from '../ai';
import type { GameState } from '../types';

/** One per-move snapshot of the board. The five zone counts sum to 52. */
export interface ProgressSnapshot {
  /** Move number this snapshot was taken at (`moveHistory.length`). */
  move: number;
  /** Cards in the stock / draw pile. */
  stock: number;
  /** Cards in the waste / discard pile. */
  waste: number;
  /** Face-down tableau cards (21 in a fresh deal, down to 0). */
  faceDown: number;
  /** Face-up tableau cards. */
  faceUp: number;
  /** Cards on the four foundations (0–52). */
  foundations: number;
  /** Blended progress score (0–100): fresh deal 0, win 100. */
  progress: number;
}

/** Build a snapshot from the current game state at a given move number. */
function snapshot(state: GameState, move: number): ProgressSnapshot {
  const { foundationCards, faceDownTotal, progressScore } =
    computeProgressComponents(state);

  let tableauTotal = 0;
  for (const column of state.tableau) tableauTotal += column.length;

  return {
    move,
    stock: state.drawPile.length,
    waste: state.discardPile.length,
    faceDown: faceDownTotal,
    faceUp: tableauTotal - faceDownTotal,
    foundations: foundationCards,
    progress: progressScore,
  };
}

/**
 * Accumulate the per-move progress series for the active game. The returned
 * array always has at least one (baseline) point and grows as moves are made.
 */
export function useProgressHistory(): ProgressSnapshot[] {
  const [history, setHistory] = useState<ProgressSnapshot[]>(() => {
    const state = useGameStore.getState() as GameState;
    return [snapshot(state, state.moveHistory.length)];
  });

  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state, prev) => {
      // New game / import / scenario load → start a fresh series.
      if (state.gameSessionId !== prev.gameSessionId) {
        setHistory([snapshot(state as GameState, state.moveHistory.length)]);
        return;
      }

      const move = state.moveHistory.length;
      if (move === prev.moveHistory.length) return; // not a move change

      setHistory((points) => {
        const next = snapshot(state as GameState, move);
        // Rewind (undo / replay jump): drop points at or past the new move
        // count, then re-anchor with the current state.
        if (points.length > 0 && points[points.length - 1].move >= move) {
          return [...points.filter((p) => p.move < move), next];
        }
        return [...points, next];
      });
    });
    return unsubscribe;
  }, []);

  return history;
}
