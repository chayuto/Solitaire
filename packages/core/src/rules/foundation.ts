/**
 * Foundation rules module
 * Functions for validating and processing foundation pile moves
 * All functions are pure and do not mutate input data
 * 
 * @module rules/foundation
 */

import type { Card, Rank, Foundations } from '../types';
import { getRankValue } from '../utils/card';

/**
 * Checks if a card can be moved to a foundation pile
 * Rules:
 * - Only Aces can be placed on empty foundations
 * - Cards must be of the same suit as the foundation
 * - Cards must be in ascending rank order (e.g., 2 on A, 3 on 2)
 * 
 * @public
 * @param card - The card to move
 * @param foundationPile - The target foundation pile
 * @returns true if the move is legal, false otherwise
 */
export function canMoveToFoundation(card: Card, foundationPile: readonly Card[]): boolean {
  // Empty foundation: only Ace can be placed
  if (foundationPile.length === 0) {
    return getRankValue(card.rank) === 1;
  }
  
  const topCard = foundationPile[foundationPile.length - 1];
  
  // Cards must be of the same suit
  if (card.suit !== topCard.suit) {
    return false;
  }
  
  // Cards must be in ascending order (card rank = top rank + 1)
  return getRankValue(card.rank) === getRankValue(topCard.rank) + 1;
}

/**
 * Gets the next expected rank for a foundation pile
 * 
 * @public
 * @param foundationPile - The foundation pile to check
 * @returns The next rank that can be placed, or null if the pile is complete (has King)
 */
export function getNextFoundationRank(foundationPile: readonly Card[]): Rank | null {
  if (foundationPile.length === 0) {
    return 'A';
  }
  
  if (foundationPile.length === 13) {
    return null; // Complete (has King)
  }
  
  const topCard = foundationPile[foundationPile.length - 1];
  const nextValue = getRankValue(topCard.rank) + 1;
  
  // Map value back to rank
  const rankMap: Record<number, Rank> = {
    1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
    8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K',
  };
  
  return rankMap[nextValue] || null;
}

/**
 * Checks if a card has a valid destination in any foundation pile
 * 
 * @public
 * @param card - The card to check
 * @param foundations - All four foundation piles
 * @returns true if the card can be moved to its suit's foundation
 */
export function hasValidFoundationDestination(card: Card, foundations: Foundations): boolean {
  const suitPile = foundations[card.suit];
  return canMoveToFoundation(card, suitPile);
}
