/**
 * Core game constants for Klondike Solitaire
 * Single source of truth for fundamental game values
 *
 * @module constants
 */

/**
 * Total number of cards in a standard deck (4 suits × 13 ranks)
 * @public
 */
export const DECK_SIZE = 52;

/**
 * Number of tableau columns in Klondike Solitaire
 * @public
 */
export const TABLEAU_COLUMNS = 7;

/**
 * Number of cards per suit (Ace through King)
 * @public
 */
export const CARDS_PER_SUIT = 13;

/**
 * Number of suits in a standard deck
 * @public
 */
export const NUM_SUITS = 4;

/**
 * Number of cards initially dealt to the tableau
 * Formula: sum from 1 to TABLEAU_COLUMNS = 1+2+3+4+5+6+7 = 28
 * @public
 */
export const TABLEAU_INITIAL_CARDS = 28;
