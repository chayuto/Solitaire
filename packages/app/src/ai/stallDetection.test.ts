/**
 * Tests for the two-gate stall-detection rule.
 *
 * Anchors come from real harvested sessions (analytics 2026-05-20 doc):
 *   - `1279a3` — long draw-dominated plateau (honest Ace-hunt). Must NOT fire.
 *   - `73fd85` — tableau-shuffle dominated plateau. Must fire.
 *   - `645d03` — late-game oscillation (5C/4D). Must fire.
 */

import { describe, it, expect } from 'vitest';
import {
  AI_AUTO_STALL_LIMIT,
  AI_AUTO_STALL_SHUFFLE_FRACTION,
} from './constants';
import {
  STALL_SHUFFLE_MOVE_TYPES,
  shouldTerminateOnStall,
  shuffleFraction,
} from './stallDetection';

describe('STALL_SHUFFLE_MOVE_TYPES', () => {
  it('contains only the two visible-rearrangement move types', () => {
    expect(STALL_SHUFFLE_MOVE_TYPES.has('tableau_to_tableau')).toBe(true);
    expect(STALL_SHUFFLE_MOVE_TYPES.has('discard_to_tableau')).toBe(true);
    expect(STALL_SHUFFLE_MOVE_TYPES.size).toBe(2);
  });

  it('excludes information-gathering moves (draw, recycle)', () => {
    expect(STALL_SHUFFLE_MOVE_TYPES.has('draw_card')).toBe(false);
    expect(STALL_SHUFFLE_MOVE_TYPES.has('recycle_stock')).toBe(false);
  });

  it('excludes foundation moves (always make progress, never on a plateau)', () => {
    expect(STALL_SHUFFLE_MOVE_TYPES.has('tableau_to_foundation')).toBe(false);
    expect(STALL_SHUFFLE_MOVE_TYPES.has('discard_to_foundation')).toBe(false);
  });
});

describe('shuffleFraction', () => {
  it('returns 0 for an empty window (no plateau, no fraction)', () => {
    expect(shuffleFraction([])).toBe(0);
  });

  it('returns 1 for an all-shuffle window', () => {
    const window = Array.from({ length: 10 }, () => 'tableau_to_tableau');
    expect(shuffleFraction(window)).toBe(1);
  });

  it('returns 0 for an all-draw window (information-gathering)', () => {
    const window = Array.from({ length: 10 }, () => 'draw_card');
    expect(shuffleFraction(window)).toBe(0);
  });

  it('treats recycle_stock as information-gathering, not shuffle', () => {
    expect(shuffleFraction(['recycle_stock'])).toBe(0);
  });

  it('blends shuffle and draw entries by count', () => {
    // 3 shuffles, 1 draw → 0.75
    const window = [
      'tableau_to_tableau',
      'discard_to_tableau',
      'tableau_to_tableau',
      'draw_card',
    ];
    expect(shuffleFraction(window)).toBe(0.75);
  });

  it('counts both shuffle subtypes', () => {
    expect(shuffleFraction(['tableau_to_tableau', 'discard_to_tableau'])).toBe(1);
  });
});

describe('shouldTerminateOnStall', () => {
  it('does not fire when the plateau is shorter than the stall limit', () => {
    const window = Array.from({ length: AI_AUTO_STALL_LIMIT - 1 }, () => 'tableau_to_tableau');
    expect(shouldTerminateOnStall(AI_AUTO_STALL_LIMIT - 1, window)).toBe(false);
  });

  it('fires on a 25-turn plateau of pure tableau-to-tableau shuffles (73fd85)', () => {
    const window = Array.from({ length: AI_AUTO_STALL_LIMIT }, () => 'tableau_to_tableau');
    expect(shouldTerminateOnStall(AI_AUTO_STALL_LIMIT, window)).toBe(true);
  });

  it('does NOT fire on a long draw-dominated plateau (honest Ace-hunt, 1279a3)', () => {
    // 24 draws + 1 recycle: plateau length AI_AUTO_STALL_LIMIT, shuffle fraction 0.
    const window = [
      ...Array.from({ length: AI_AUTO_STALL_LIMIT - 1 }, () => 'draw_card'),
      'recycle_stock',
    ];
    expect(shouldTerminateOnStall(AI_AUTO_STALL_LIMIT, window)).toBe(false);
  });

  it('fires on the late-game 5C/4D oscillation (645d03)', () => {
    // ~75-turn plateau dominated by tableau-to-tableau swaps.
    const window = Array.from({ length: 30 }, (_, i) =>
      i % 5 === 0 ? 'discard_to_tableau' : 'tableau_to_tableau',
    );
    expect(shouldTerminateOnStall(75, window)).toBe(true);
  });

  it('fires right at the shuffle-fraction threshold', () => {
    // Exactly AI_AUTO_STALL_SHUFFLE_FRACTION shuffles → boundary fires.
    const shuffleCount = Math.ceil(
      AI_AUTO_STALL_LIMIT * AI_AUTO_STALL_SHUFFLE_FRACTION,
    );
    const drawCount = AI_AUTO_STALL_LIMIT - shuffleCount;
    const window = [
      ...Array.from({ length: shuffleCount }, () => 'tableau_to_tableau'),
      ...Array.from({ length: drawCount }, () => 'draw_card'),
    ];
    expect(shuffleFraction(window)).toBeGreaterThanOrEqual(
      AI_AUTO_STALL_SHUFFLE_FRACTION,
    );
    expect(shouldTerminateOnStall(AI_AUTO_STALL_LIMIT, window)).toBe(true);
  });

  it('does not fire just below the shuffle-fraction threshold', () => {
    // One fewer shuffle than the boundary.
    const shuffleCount = Math.ceil(
      AI_AUTO_STALL_LIMIT * AI_AUTO_STALL_SHUFFLE_FRACTION,
    ) - 1;
    const drawCount = AI_AUTO_STALL_LIMIT - shuffleCount;
    const window = [
      ...Array.from({ length: shuffleCount }, () => 'tableau_to_tableau'),
      ...Array.from({ length: drawCount }, () => 'draw_card'),
    ];
    expect(shuffleFraction(window)).toBeLessThan(
      AI_AUTO_STALL_SHUFFLE_FRACTION,
    );
    expect(shouldTerminateOnStall(AI_AUTO_STALL_LIMIT, window)).toBe(false);
  });

  it('respects override thresholds for ablations', () => {
    const window = Array.from({ length: 10 }, () => 'tableau_to_tableau');
    // Lower the gate: 10 plateau turns with full shuffles → fires.
    expect(shouldTerminateOnStall(10, window, 10, 0.5)).toBe(true);
    // Raise the plateau gate above 10 → does not fire.
    expect(shouldTerminateOnStall(10, window, 25, 0.5)).toBe(false);
    // Raise the fraction gate above 1 → impossible, never fires.
    expect(shouldTerminateOnStall(10, window, 10, 1.1)).toBe(false);
  });
});
