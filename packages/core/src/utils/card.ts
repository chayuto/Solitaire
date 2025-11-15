/**
 * Card utility functions
 * Pure functions for working with Card objects
 * All functions are immutable and do not modify input cards
 */

import type { Card, Suit, Rank } from '../types';

/**
 * All possible card suits in a standard deck
 */
export const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'] as const;

/**
 * All possible card ranks in a standard deck (Ace through King)
 */
export const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

/**
 * Mapping of rank to numeric value for game logic
 * Ace=1, 2-10=face value, Jack=11, Queen=12, King=13
 */
export const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
} as const;

/**
 * Red suits for color checking
 */
const RED_SUITS: readonly Suit[] = ['hearts', 'diamonds'] as const;

/**
 * Black suits for color checking
 */
const BLACK_SUITS: readonly Suit[] = ['clubs', 'spades'] as const;

/**
 * Checks if a suit is red (hearts or diamonds)
 * @param suit - The suit to check
 * @returns true if the suit is red, false otherwise
 */
export function isRed(suit: Suit): boolean {
  return RED_SUITS.includes(suit);
}

/**
 * Checks if a card is red
 * @param card - The card to check
 * @returns true if the card is red, false otherwise
 */
export function isRedCard(card: Card): boolean {
  return isRed(card.suit);
}

/**
 * Checks if a suit is black (clubs or spades)
 * @param suit - The suit to check
 * @returns true if the suit is black, false otherwise
 */
export function isBlack(suit: Suit): boolean {
  return BLACK_SUITS.includes(suit);
}

/**
 * Checks if a card is black
 * @param card - The card to check
 * @returns true if the card is black, false otherwise
 */
export function isBlackCard(card: Card): boolean {
  return isBlack(card.suit);
}

/**
 * Gets the color of a suit
 * @param suit - The suit to check
 * @returns 'red' for hearts/diamonds, 'black' for clubs/spades
 */
export function getColor(suit: Suit): 'red' | 'black' {
  return isRed(suit) ? 'red' : 'black';
}

/**
 * Gets the color of a card
 * @param card - The card to check
 * @returns 'red' for hearts/diamonds, 'black' for clubs/spades
 */
export function getCardColor(card: Card): 'red' | 'black' {
  return getColor(card.suit);
}

/**
 * Gets the numeric value of a card rank
 * Ace=1, 2-10=face value, Jack=11, Queen=12, King=13
 * @param rank - The rank to get the value for
 * @returns The numeric value of the rank
 */
export function getRankValue(rank: Rank): number {
  return RANK_VALUES[rank];
}

/**
 * Compares two ranks
 * @param rank1 - First rank to compare
 * @param rank2 - Second rank to compare
 * @returns Negative if rank1 < rank2, 0 if equal, positive if rank1 > rank2
 */
export function compareRanks(rank1: Rank, rank2: Rank): number {
  return getRankValue(rank1) - getRankValue(rank2);
}

/**
 * Creates a new card with the given properties
 * @param suit - The suit of the card
 * @param rank - The rank of the card
 * @param faceUp - Whether the card should be face up (default: false)
 * @returns A new Card object
 */
export function createCard(suit: Suit, rank: Rank, faceUp: boolean = false): Card {
  return {
    suit,
    rank,
    faceUp,
    id: `${suit}-${rank}`,
  };
}

/**
 * Creates a new card with the face up/down state flipped
 * Returns a new card object; does not modify the input
 * @param card - The card to flip
 * @returns A new Card with the opposite faceUp state
 */
export function flipCard(card: Card): Card {
  return {
    ...card,
    faceUp: !card.faceUp,
  };
}

/**
 * Checks if two cards are opposite colors
 * @param card1 - First card
 * @param card2 - Second card
 * @returns true if cards are opposite colors (one red, one black)
 */
export function areOppositeColors(card1: Card, card2: Card): boolean {
  return getCardColor(card1) !== getCardColor(card2);
}

/**
 * Checks if two cards are the same color
 * @param card1 - First card
 * @param card2 - Second card
 * @returns true if both cards are the same color
 */
export function areSameColor(card1: Card, card2: Card): boolean {
  return getCardColor(card1) === getCardColor(card2);
}
