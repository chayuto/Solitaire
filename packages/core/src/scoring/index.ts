/**
 * Scoring system implementation
 * Functions for calculating game completion progress and perceived difficulty
 */

import type { GameState } from '../types';
import { getRankValue } from '../utils/card';
import { DECK_SIZE } from '../constants';

/**
 * Calculate the game completion progress as a percentage
 * Based on the number of cards in the foundation piles
 * 
 * @param state - The current game state
 * @returns Completion progress as a percentage (0-100)
 */
export function getCompletionProgress(state: GameState): number {
  const cardsInFoundations = 
    state.foundations.hearts.length +
    state.foundations.diamonds.length +
    state.foundations.clubs.length +
    state.foundations.spades.length;
  
  return (cardsInFoundations / DECK_SIZE) * 100;
}

/**
 * Calculate the perceived difficulty of the current game state
 * Based on various factors like hidden cards, card distribution, etc.
 * Higher score means more difficult
 * 
 * @param state - The current game state
 * @returns Difficulty score (0-100)
 */
export function getPerceivedDifficulty(state: GameState): number {
  let score = 0;
  
  // 1. Hidden cards factor (each hidden card adds difficulty)
  // Harder when more cards are face down
  const hiddenCards = state.tableau.flat().filter(card => !card.faceUp).length;
  score += hiddenCards * 2; // Weight: 2 points per hidden card
  
  // 2. Kings buried in tableau (harder when Kings are not accessible)
  let buriedKings = 0;
  for (const column of state.tableau) {
    for (let i = 0; i < column.length - 1; i++) {
      const card = column[i];
      if (getRankValue(card.rank) === 13 && !card.faceUp) {
        buriedKings++;
      }
    }
  }
  score += buriedKings * 5; // Weight: 5 points per buried King
  
  // 3. Empty tableau columns (easier when we have empty columns)
  const emptyColumns = state.tableau.filter(col => col.length === 0).length;
  score -= emptyColumns * 3; // Weight: -3 points per empty column
  
  // 4. Cards in discard pile (harder when many cards are in discard)
  // This indicates potentially missed opportunities
  score += state.discardPile.length * 0.5; // Weight: 0.5 points per discard card
  
  // 5. Foundation progress (easier when closer to winning)
  const foundationCards = 
    state.foundations.hearts.length +
    state.foundations.diamonds.length +
    state.foundations.clubs.length +
    state.foundations.spades.length;
  score -= foundationCards * 1; // Weight: -1 point per foundation card
  
  // Normalize to 0-100 range
  return Math.max(0, Math.min(100, score));
}
