import { describe, it, expect } from 'vitest';
import {
  computeGameStats,
  computePace,
  formatElapsed,
} from './computeStats';
import type { ProgressSnapshot } from '../../hooks/useProgressHistory';

/** Build a snapshot with sensible defaults; override only what a test cares about. */
function snap(p: Partial<ProgressSnapshot> & { move: number }): ProgressSnapshot {
  return {
    move: p.move,
    stock: p.stock ?? 24,
    waste: p.waste ?? 0,
    faceDown: p.faceDown ?? 21,
    faceUp: p.faceUp ?? 7,
    foundations: p.foundations ?? 0,
    progress: p.progress ?? 0,
  };
}

describe('computeGameStats', () => {
  it('returns zeros and a null efficiency for a fresh deal (single baseline point)', () => {
    const stats = computeGameStats([snap({ move: 0 })]);
    expect(stats).toEqual({
      moves: 0,
      transitions: 0,
      productiveMoves: 0,
      efficiencyPct: null,
      movesSinceProgress: 0,
      drawMoves: 0,
    });
  });

  it('handles an empty history without throwing', () => {
    expect(computeGameStats([])).toMatchObject({ moves: 0, transitions: 0 });
  });

  it('counts a revealed face-down card as a productive move', () => {
    const stats = computeGameStats([
      snap({ move: 0, faceDown: 21 }),
      snap({ move: 1, faceDown: 20 }), // revealed one
    ]);
    expect(stats.productiveMoves).toBe(1);
    expect(stats.efficiencyPct).toBe(100);
    expect(stats.movesSinceProgress).toBe(0);
  });

  it('counts a card banked to a foundation as a productive move', () => {
    const stats = computeGameStats([
      snap({ move: 0, foundations: 0 }),
      snap({ move: 1, foundations: 1 }), // banked one
    ]);
    expect(stats.productiveMoves).toBe(1);
    expect(stats.efficiencyPct).toBe(100);
  });

  it('treats a pure draw (stock shrinks, no reveal/bank) as unproductive and counts it as a draw', () => {
    const stats = computeGameStats([
      snap({ move: 0, stock: 24, waste: 0 }),
      snap({ move: 1, stock: 23, waste: 1 }), // drew one, nothing revealed
    ]);
    expect(stats.productiveMoves).toBe(0);
    expect(stats.drawMoves).toBe(1);
    expect(stats.efficiencyPct).toBe(0);
    expect(stats.movesSinceProgress).toBe(1);
  });

  it('tracks the trailing stuck streak and resets it on the next productive move', () => {
    const history = [
      snap({ move: 0, foundations: 0, faceDown: 21 }),
      snap({ move: 1, foundations: 1, faceDown: 21 }), // productive
      snap({ move: 2, stock: 23, waste: 1 }), // draw — stuck 1
      snap({ move: 3, stock: 22, waste: 2 }), // draw — stuck 2
      snap({ move: 4, stock: 21, waste: 3 }), // draw — stuck 3
    ];
    expect(computeGameStats(history).movesSinceProgress).toBe(3);

    const recovered = [...history, snap({ move: 5, foundations: 2, faceDown: 21 })];
    expect(computeGameStats(recovered).movesSinceProgress).toBe(0);
  });

  it('computes efficiency as productive / total transitions', () => {
    const stats = computeGameStats([
      snap({ move: 0, foundations: 0, faceDown: 21, stock: 24, waste: 0 }),
      snap({ move: 1, foundations: 0, faceDown: 20, stock: 24, waste: 0 }), // reveal (productive)
      snap({ move: 2, foundations: 0, faceDown: 20, stock: 23, waste: 1 }), // draw (not)
      snap({ move: 3, foundations: 1, faceDown: 20, stock: 23, waste: 0 }), // bank (productive)
      snap({ move: 4, foundations: 1, faceDown: 20, stock: 22, waste: 1 }), // draw (not)
    ]);
    expect(stats.transitions).toBe(4);
    expect(stats.productiveMoves).toBe(2);
    expect(stats.efficiencyPct).toBe(50);
    expect(stats.drawMoves).toBe(2);
    expect(stats.moves).toBe(4);
  });
});

describe('formatElapsed', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(9_000)).toBe('0:09');
    expect(formatElapsed(84_000)).toBe('1:24');
    expect(formatElapsed(605_000)).toBe('10:05');
  });

  it('clamps negative input to zero', () => {
    expect(formatElapsed(-500)).toBe('0:00');
  });
});

describe('computePace', () => {
  it('returns moves per minute once enough time has elapsed', () => {
    expect(computePace(42, 84_000)).toBe(30); // 42 moves in 1.4 min ≈ 30/min
  });

  it('returns null at t≈0 to avoid a divide-by-near-zero spike', () => {
    expect(computePace(5, 100)).toBeNull();
  });

  it('returns null when no moves have been made', () => {
    expect(computePace(0, 60_000)).toBeNull();
  });
});
