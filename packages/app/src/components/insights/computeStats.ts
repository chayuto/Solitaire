/**
 * Derived "box-score" stats for the Game Insights stat strip.
 *
 * Pure functions over the per-move {@link ProgressSnapshot} series, so they are
 * trivially unit-testable and carry no React/store coupling. Everything here is
 * reconstructable from the snapshot history — no new store fields needed.
 *
 * @module components/insights/computeStats
 */

import type { ProgressSnapshot } from '../../hooks/useProgressHistory';

/** Box-score stats derived from the progress series. */
export interface GameStats {
  /** Latest move number in the series. */
  moves: number;
  /** Number of move transitions (one less than the snapshot count). */
  transitions: number;
  /** Transitions that revealed a face-down card or sent a card home. */
  productiveMoves: number;
  /**
   * Productive moves as a 0–100 integer (`productiveMoves / transitions`).
   * `null` when there are no transitions yet (a fresh deal) — callers render
   * a dash rather than a misleading 0%.
   */
  efficiencyPct: number | null;
  /** Consecutive trailing moves that made no progress (the "stuck-o-meter"). */
  movesSinceProgress: number;
  /** Transitions that drew a card from the stock (stock shrank). */
  drawMoves: number;
}

/** Did this transition make real progress (reveal a card or bank one home)? */
function isProductive(prev: ProgressSnapshot, next: ProgressSnapshot): boolean {
  const banked = next.foundations > prev.foundations;
  const revealed = next.faceDown < prev.faceDown;
  return banked || revealed;
}

/**
 * Compute the box-score stats for a progress series. Safe on an empty or
 * single-point history (a fresh deal): returns zeros and a `null` efficiency.
 */
export function computeGameStats(history: ProgressSnapshot[]): GameStats {
  const moves = history.length > 0 ? history[history.length - 1].move : 0;
  const transitions = Math.max(0, history.length - 1);

  let productiveMoves = 0;
  let drawMoves = 0;
  let movesSinceProgress = 0;

  for (let i = 1; i < history.length; i += 1) {
    const prev = history[i - 1];
    const next = history[i];

    if (isProductive(prev, next)) {
      productiveMoves += 1;
      movesSinceProgress = 0;
    } else {
      movesSinceProgress += 1;
    }

    if (next.stock < prev.stock) drawMoves += 1;
  }

  const efficiencyPct =
    transitions > 0 ? Math.round((productiveMoves / transitions) * 100) : null;

  return {
    moves,
    transitions,
    productiveMoves,
    efficiencyPct,
    movesSinceProgress,
    drawMoves,
  };
}

/** Format an elapsed-millisecond duration as `M:SS`. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Moves-per-minute pace, or `null` when too little time has elapsed for the
 * figure to be meaningful (avoids a divide-by-near-zero spike at t≈0).
 */
export function computePace(moves: number, elapsedMs: number): number | null {
  const elapsedMinutes = elapsedMs / 60_000;
  if (moves <= 0 || elapsedMinutes < 0.05) return null;
  return Math.round(moves / elapsedMinutes);
}
