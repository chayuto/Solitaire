/**
 * Game state type definitions
 * Pure game state without UI-specific fields
 */

import type { Card, Suit } from './Card';
import type { Move } from './Move';
import type { Difficulty } from './Difficulty';

/**
 * The four foundation piles, one for each suit
 */
export interface Foundations {
  readonly hearts: readonly Card[];
  readonly diamonds: readonly Card[];
  readonly clubs: readonly Card[];
  readonly spades: readonly Card[];
}

/**
 * Complete game state
 * All fields are readonly to enforce immutability
 * This is the pure game state without any UI-specific fields
 */
export interface GameState {
  /** Cards remaining in the stock (draw pile) */
  readonly drawPile: readonly Card[];
  /** Cards in the waste pile (discard pile) */
  readonly discardPile: readonly Card[];
  /** The four foundation piles */
  readonly foundations: Foundations;
  /** The seven tableau columns */
  readonly tableau: readonly (readonly Card[])[];
  /** Move history for undo/replay */
  readonly moveHistory: readonly Move[];
  /** Difficulty level of the game */
  readonly difficulty: Difficulty;
  /** Whether the game has been won */
  readonly gameWon: boolean;
  /** Game completion percentage (0-100) */
  readonly completionProgress: number;
  /** Initial board setup for replay/analysis */
  readonly initialBoardSetup?: {
    readonly drawPile: readonly Card[];
    readonly discardPile: readonly Card[];
    readonly foundations: Foundations;
    readonly tableau: readonly (readonly Card[])[];
  };
  /** Perceived difficulty score (0-100, based on board analysis) */
  readonly perceivedDifficulty?: number;
}

/**
 * Options for initializing a new game
 */
export interface InitializeOptions {
  /** Difficulty level (default: 3) */
  readonly difficulty?: Difficulty;
  /** Custom deck to use instead of generating one */
  readonly customDeck?: readonly Card[];
  /** Random seed for reproducible games */
  readonly seed?: number;
}
