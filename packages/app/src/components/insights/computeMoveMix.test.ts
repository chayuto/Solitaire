import { describe, it, expect } from 'vitest';
import { computeMoveMix } from './computeMoveMix';
import type { Card, Move, MoveType } from '../../types';

const card = (id: string): Card => ({
  id,
  suit: 'spades',
  rank: '5',
  faceUp: true,
});

/** Build a move; tableau moves take from/to column indices. */
function mv(
  type: MoveType,
  opts: { id?: string; from?: number; to?: number; ai?: boolean } = {},
): Move {
  return {
    type,
    timestamp: 0,
    card: card(opts.id ?? 'x'),
    from: opts.from != null ? { source: 'tableau', columnIndex: opts.from } : undefined,
    to: opts.to != null ? { target: 'tableau', columnIndex: opts.to } : undefined,
    aiMove: opts.ai,
  };
}

describe('computeMoveMix', () => {
  it('returns zeros for an empty history', () => {
    const r = computeMoveMix([]);
    expect(r.total).toBe(0);
    expect(r.backAndForth).toBe(0);
    expect(r.rows.map((x) => x.count)).toEqual([0, 0, 0, 0, 0]);
  });

  it('buckets move types and sums the total (autoplay events excluded)', () => {
    const r = computeMoveMix([
      mv('draw_card'),
      mv('draw_card'),
      mv('flip_card'),
      mv('tableau_to_foundation'),
      mv('discard_to_foundation'),
      mv('tableau_to_tableau', { from: 0, to: 1 }),
      mv('discard_to_tableau'),
      mv('autoplay_start'),
      mv('autoplay_stop'),
    ]);
    const byId = Object.fromEntries(r.rows.map((x) => [x.id, x.count]));
    expect(byId).toEqual({
      draws: 2,
      reveals: 1,
      foundation: 2, // tableau_to_foundation + discard_to_foundation
      tableau: 1,
      waste: 1,
    });
    expect(r.total).toBe(7); // the two autoplay_* events are not counted
  });

  it('counts a card returning to the column it just left as back-and-forth', () => {
    const r = computeMoveMix([
      mv('tableau_to_tableau', { id: 'a', from: 0, to: 3 }), // a: 0 → 3
      mv('tableau_to_tableau', { id: 'a', from: 3, to: 0 }), // a: 3 → 0  (reversal)
    ]);
    expect(r.backAndForth).toBe(1);
    expect(r.backAndForthAI).toBe(0);
  });

  it('attributes a back-and-forth to the AI when that move is an AI move', () => {
    const r = computeMoveMix([
      mv('tableau_to_tableau', { id: 'a', from: 2, to: 5 }),
      mv('tableau_to_tableau', { id: 'a', from: 5, to: 2, ai: true }), // reversal, AI
    ]);
    expect(r.backAndForth).toBe(1);
    expect(r.backAndForthAI).toBe(1);
  });

  it('does not flag a non-reversing onward move', () => {
    const r = computeMoveMix([
      mv('tableau_to_tableau', { id: 'a', from: 0, to: 3 }),
      mv('tableau_to_tableau', { id: 'a', from: 3, to: 6 }), // 3 → 6, not back to 0
    ]);
    expect(r.backAndForth).toBe(0);
  });

  it('tracks reversals per card independently', () => {
    const r = computeMoveMix([
      mv('tableau_to_tableau', { id: 'a', from: 0, to: 1 }),
      mv('tableau_to_tableau', { id: 'b', from: 4, to: 5 }),
      mv('tableau_to_tableau', { id: 'a', from: 1, to: 0 }), // a reversal
      mv('tableau_to_tableau', { id: 'b', from: 5, to: 4 }), // b reversal
    ]);
    expect(r.backAndForth).toBe(2);
  });

  it('ignores tableau moves missing column indices', () => {
    const r = computeMoveMix([
      mv('tableau_to_tableau', { id: 'a' }), // no from/to cols
      mv('tableau_to_tableau', { id: 'a' }),
    ]);
    expect(r.backAndForth).toBe(0);
  });
});
