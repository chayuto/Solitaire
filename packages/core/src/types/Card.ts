/**
 * Card type definitions
 * Core immutable types for representing playing cards
 */

/**
 * The four suits in a standard deck
 */
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

/**
 * The thirteen ranks in a standard deck
 * A = Ace, J = Jack, Q = Queen, K = King
 */
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

/**
 * A playing card
 * All properties are readonly to enforce immutability
 */
export interface Card {
  /** The suit of the card */
  readonly suit: Suit;
  /** The rank of the card */
  readonly rank: Rank;
  /** Whether the card is face up */
  readonly faceUp: boolean;
  /** Unique identifier for the card (e.g., "hearts-A") */
  readonly id: string;
}
