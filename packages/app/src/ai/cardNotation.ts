/**
 * Compact card notation shared by the AI context payload and move descriptions.
 *
 * Cards are written rank-first, as in standard card notation: `AS` = Ace of
 * Spades, `TD` = Ten of Diamonds, `3H` = Three of Hearts, `KC` = King of Clubs.
 *
 * @module ai/cardNotation
 */

import type { Card, Rank, Suit } from '../types';

/** Single-letter suit codes. */
const SUIT_LETTER: Record<Suit, string> = {
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
  spades: 'S',
};

/** Human-readable suit names, for descriptions. */
export const SUIT_NAME: Record<Suit, string> = {
  hearts: 'hearts',
  diamonds: 'diamonds',
  clubs: 'clubs',
  spades: 'spades',
};

/** One-line explanation of the notation, included in the AI context payload. */
export const NOTATION_LEGEND =
  'Cards are written rank then suit. Ranks: A 2 3 4 5 6 7 8 9 T(=10) J Q K. ' +
  'Suits: H=hearts D=diamonds C=clubs S=spades. Example: "TD" = Ten of Diamonds.';

/** Short rank code (`10` becomes `T`; all others are unchanged). */
export function rankShort(rank: Rank): string {
  return rank === '10' ? 'T' : rank;
}

/** Short notation for a card, e.g. `TD`, `AS`, `3H`. */
export function cardShort(card: Card): string {
  return rankShort(card.rank) + SUIT_LETTER[card.suit];
}

/** Short notation for a list of cards, bottom-to-top. */
export function cardsShort(cards: readonly Card[]): string[] {
  return cards.map(cardShort);
}
