/**
 * Tableau rules module
 * Functions for validating and processing tableau pile moves
 * All functions are pure and do not mutate input data
 */

import type { Card } from '../types';
import { getColor, getRankValue } from '../utils/card';

/**
 * Checks if a card can be moved to a tableau column
 * Rules:
 * - Only Kings can be placed on empty columns
 * - Cards must alternate colors (red on black, black on red)
 * - Cards must be in descending rank order (e.g., 7 on 8, Q on K)
 * 
 * @param card - The card to move
 * @param targetColumn - The target tableau column
 * @returns true if the move is legal, false otherwise
 */
export function canMoveToTableau(card: Card, targetColumn: readonly Card[]): boolean {
  // Empty column: only King can be placed
  if (targetColumn.length === 0) {
    return getRankValue(card.rank) === 13;
  }
  
  const topCard = targetColumn[targetColumn.length - 1];
  
  // Cards must alternate colors
  if (getColor(card.suit) === getColor(topCard.suit)) {
    return false;
  }
  
  // Cards must be in descending order (card rank = top rank - 1)
  return getRankValue(card.rank) === getRankValue(topCard.rank) - 1;
}

/**
 * Checks if a sequence of cards can be moved to a tableau column
 * The sequence must be valid (alternating colors, descending ranks)
 * and the first card of the sequence must be movable to the target
 * 
 * @param cards - The sequence of cards to move
 * @param targetColumn - The target tableau column
 * @returns true if the sequence can be moved, false otherwise
 */
export function canMoveSequence(cards: readonly Card[], targetColumn: readonly Card[]): boolean {
  if (cards.length === 0) {
    return false;
  }
  
  // Check if the first card can be moved to target
  if (!canMoveToTableau(cards[0], targetColumn)) {
    return false;
  }
  
  // Verify the sequence itself is valid
  for (let i = 1; i < cards.length; i++) {
    const prevCard = cards[i - 1];
    const currCard = cards[i];
    
    // Must alternate colors
    if (getColor(prevCard.suit) === getColor(currCard.suit)) {
      return false;
    }
    
    // Must descend in rank
    if (getRankValue(currCard.rank) !== getRankValue(prevCard.rank) - 1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Gets all valid tableau destination columns for a card
 * 
 * @param card - The card to move
 * @param tableau - All tableau columns
 * @param sourceColumn - Optional source column index (to exclude it from results)
 * @returns Array of column indices where the card can be legally moved
 */
export function getValidTableauDestinations(
  card: Card,
  tableau: readonly (readonly Card[])[],
  sourceColumn?: number
): number[] {
  const destinations: number[] = [];
  
  for (let i = 0; i < tableau.length; i++) {
    // Skip source column
    if (sourceColumn !== undefined && i === sourceColumn) {
      continue;
    }
    
    if (canMoveToTableau(card, tableau[i])) {
      destinations.push(i);
    }
  }
  
  return destinations;
}
