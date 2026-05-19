/**
 * Game-progress metric for the AI advisor / harvesting pipeline.
 *
 * `completionProgress` (foundation cards / 52) is the win number but a poor
 * *progress* signal: it sits flat through the early and mid game, where the
 * real work is revealing face-down tableau cards. This module adds a blended
 * score and exposes its raw components, so a harvester can reliably detect a
 * stalled game — foundations *and* revealed cards both flat.
 *
 * The formula and weights follow the data team's `GAME_PROGRESS_METRIC` proposal.
 *
 * @module ai/progressMetric
 */

import type { GameState, Suit } from '../types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

/** Face-down cards in a fresh Klondike deal: 0+1+2+3+4+5+6. */
const INITIAL_FACE_DOWN = 21;

/** Foundation weight in the blended score (it is the win condition). */
const FOUNDATION_WEIGHT = 0.65;

/** Revealed-card weight in the blended score (it is the enabling work). */
const REVEAL_WEIGHT = 0.35;

/** The raw progress components plus the blended score. */
export interface ProgressComponents {
  /** Cards currently on the four foundations (0–52). */
  foundationCards: number;
  /** Face-down cards across the seven tableau columns (21 down to 0). */
  faceDownTotal: number;
  /** Blended progress score (0–100): a fresh deal is 0, a win is 100. */
  progressScore: number;
}

/** Compute the progress components for a game state. */
export function computeProgressComponents(state: GameState): ProgressComponents {
  let foundationCards = 0;
  for (const suit of SUITS) foundationCards += state.foundations[suit].length;

  let faceDownTotal = 0;
  for (const column of state.tableau) {
    for (const card of column) if (!card.faceUp) faceDownTotal += 1;
  }

  const revealed = INITIAL_FACE_DOWN - faceDownTotal;
  const progressScore = Math.round(
    100 *
      (FOUNDATION_WEIGHT * (foundationCards / 52) +
        REVEAL_WEIGHT * (revealed / INITIAL_FACE_DOWN)),
  );

  return { foundationCards, faceDownTotal, progressScore };
}
