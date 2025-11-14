/**
 * Core game constants for Solitaire
 * Defines the fundamental building blocks of the card game
 */

import type { Suit, Rank } from '../types';

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
 */
export const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
} as const;

/**
 * Total number of cards in a standard deck
 */
export const DECK_SIZE = 52;

/**
 * Number of tableau columns in Klondike Solitaire
 */
export const TABLEAU_COLUMNS = 7;

/**
 * Number of cards initially dealt to the tableau
 * Formula: sum from 1 to 7 = 28 cards
 */
export const TABLEAU_INITIAL_CARDS = 28;

/**
 * Suit symbols for display
 */
export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
} as const;

/**
 * Red suits for color checking
 */
export const RED_SUITS: readonly Suit[] = ['hearts', 'diamonds'] as const;

/**
 * Black suits for color checking
 */
export const BLACK_SUITS: readonly Suit[] = ['clubs', 'spades'] as const;
