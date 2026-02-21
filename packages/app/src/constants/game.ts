/**
 * Core game constants for Solitaire
 * Re-exports fundamental constants from @chayuto/solitaire-core (single source of truth)
 * and adds UI-specific constants
 */

import type { Suit } from '../types';

// Re-export core constants to maintain the same public API for app consumers
export {
  SUITS,
  RANKS,
  RANK_VALUES,
  RED_SUITS,
  BLACK_SUITS,
  DECK_SIZE,
  TABLEAU_COLUMNS,
  TABLEAU_INITIAL_CARDS,
} from '@chayuto/solitaire-core';

/**
 * Suit symbols for display (UI-specific)
 */
export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
} as const;
