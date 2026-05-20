/**
 * Stall-detection helpers for the AI auto-play loop.
 *
 * The auto-play loop already counts consecutive flat-progress turns
 * (`AI_AUTO_STALL_LIMIT`); this module adds the second gate of the two-gate
 * rule — a *shuffle fraction* over the move-type window — and exposes both
 * pieces as pure functions so the rule is unit-testable without driving the
 * full store.
 *
 * Rationale and constants live in `constants.ts`. Empirical anchors:
 *   - `1279a3` — long plateau, draw-dominated → honest hunt, must NOT fire.
 *   - `73fd85` / `645d03` — long plateau, tableau-shuffle dominated → fires.
 *
 * @module ai/stallDetection
 */

import { AI_AUTO_STALL_LIMIT, AI_AUTO_STALL_SHUFFLE_FRACTION } from './constants';

/**
 * Move types that count as *shuffles* — rearranging visible cards without
 * surfacing new information. The complement (`draw_card`, `recycle_stock`)
 * is information-gathering and tolerated during a plateau.
 *
 * Foundation moves (`tableau_to_foundation`, `discard_to_foundation`) always
 * make progress and therefore cannot appear in a plateau window; they are
 * intentionally excluded from this set rather than listed as non-shuffles.
 */
export const STALL_SHUFFLE_MOVE_TYPES: ReadonlySet<string> = new Set([
  'tableau_to_tableau',
  'discard_to_tableau',
]);

/**
 * Fraction of moves in {@link window} that count as shuffles. Returns 0 for an
 * empty window so a not-yet-flat run never satisfies the threshold by vacuity.
 */
export function shuffleFraction(window: readonly string[]): number {
  if (window.length === 0) return 0;
  let shuffles = 0;
  for (const moveType of window) {
    if (STALL_SHUFFLE_MOVE_TYPES.has(moveType)) shuffles += 1;
  }
  return shuffles / window.length;
}

/**
 * Whether the AI auto-play run should terminate on stall grounds. Both gates
 * must fire: plateau long enough AND shuffle fraction high enough.
 *
 * Defaults use the production thresholds; pass overrides only from tests.
 */
export function shouldTerminateOnStall(
  plateauLength: number,
  recentMoveTypes: readonly string[],
  stallLimit: number = AI_AUTO_STALL_LIMIT,
  shuffleFractionThreshold: number = AI_AUTO_STALL_SHUFFLE_FRACTION,
): boolean {
  if (plateauLength < stallLimit) return false;
  return shuffleFraction(recentMoveTypes) >= shuffleFractionThreshold;
}
