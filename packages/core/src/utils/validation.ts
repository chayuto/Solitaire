/**
 * Game state validation utilities
 * Functions for validating game states and ensuring correctness
 */

import type { GameState, Card } from '../types';
import { getRankValue } from './card';
import { DECK_SIZE, TABLEAU_COLUMNS } from '../constants';

/**
 * Counts the total number of cards in a game state
 * @param state - The game state to count cards in
 * @returns The total number of cards
 */
export function countCards(state: GameState): number {
  let count = 0;
  
  // Count draw pile
  count += state.drawPile.length;
  
  // Count discard pile
  count += state.discardPile.length;
  
  // Count foundations
  count += state.foundations.hearts.length;
  count += state.foundations.diamonds.length;
  count += state.foundations.clubs.length;
  count += state.foundations.spades.length;
  
  // Count tableau
  for (const column of state.tableau) {
    count += column.length;
  }
  
  return count;
}

/**
 * Finds duplicate card IDs in a game state
 * @param state - The game state to check
 * @returns Array of duplicate card IDs (empty if no duplicates)
 */
export function findDuplicates(state: GameState): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  
  const checkCard = (card: Card) => {
    if (seen.has(card.id)) {
      duplicates.add(card.id);
    } else {
      seen.add(card.id);
    }
  };
  
  // Check draw pile
  state.drawPile.forEach(checkCard);
  
  // Check discard pile
  state.discardPile.forEach(checkCard);
  
  // Check foundations
  state.foundations.hearts.forEach(checkCard);
  state.foundations.diamonds.forEach(checkCard);
  state.foundations.clubs.forEach(checkCard);
  state.foundations.spades.forEach(checkCard);
  
  // Check tableau
  for (const column of state.tableau) {
    column.forEach(checkCard);
  }
  
  return Array.from(duplicates);
}

/**
 * Validates that foundation piles are in correct sequence
 * Foundation cards must be in order: A, 2, 3, ..., K
 * @param foundation - Array of cards in a foundation pile
 * @param suitName - Name of the suit for error messages
 * @returns Error message if invalid, null if valid
 */
function validateFoundationSequence(foundation: readonly Card[], suitName: string): string | null {
  if (foundation.length === 0) {
    return null; // Empty foundation is valid
  }
  
  // First card must be an Ace
  if (foundation[0].rank !== 'A') {
    return `${suitName} foundation must start with an Ace, found ${foundation[0].rank}`;
  }
  
  // Check that cards are in sequence
  for (let i = 0; i < foundation.length; i++) {
    const expectedValue = i + 1;
    const actualValue = getRankValue(foundation[i].rank);
    
    if (actualValue !== expectedValue) {
      return `${suitName} foundation has card ${foundation[i].rank} at position ${i}, expected rank value ${expectedValue}`;
    }
  }
  
  return null;
}

/**
 * Validates that tableau columns follow proper face-up/face-down rules
 * All face-down cards must come before face-up cards in a column
 * @param column - Array of cards in a tableau column
 * @param columnIndex - Index of the column for error messages
 * @returns Error message if invalid, null if valid
 */
function validateTableauColumn(column: readonly Card[], columnIndex: number): string | null {
  if (column.length === 0) {
    return null; // Empty column is valid
  }
  
  let foundFaceUp = false;
  
  for (let i = 0; i < column.length; i++) {
    const card = column[i];
    
    if (card.faceUp) {
      foundFaceUp = true;
    } else if (foundFaceUp) {
      // Found a face-down card after a face-up card
      return `Tableau column ${columnIndex} has face-down card at position ${i} after face-up cards`;
    }
  }
  
  return null;
}

/**
 * Checks if a game state is valid according to Solitaire rules
 * @param state - The game state to validate
 * @returns true if the state is valid, false otherwise
 */
export function isValidGameState(state: GameState): boolean {
  try {
    validateGameState(state);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a game state according to Solitaire rules
 * Throws an error with a descriptive message if invalid
 * 
 * Validation rules:
 * 1. Exactly 52 cards total
 * 2. No duplicate card IDs
 * 3. All cards have valid suit/rank combinations
 * 4. Foundation piles are sequential (A, 2, 3, ...)
 * 5. Foundation cards match their suit
 * 6. Tableau face-up cards come after face-down cards
 * 7. Tableau has exactly 7 columns
 * 
 * @param state - The game state to validate
 * @throws Error if the state is invalid
 */
export function validateGameState(state: GameState): void {
  // Rule 7: Check tableau has 7 columns
  if (state.tableau.length !== TABLEAU_COLUMNS) {
    throw new Error(`Tableau must have exactly ${TABLEAU_COLUMNS} columns, found ${state.tableau.length}`);
  }
  
  // Rule 1: Check total card count
  const totalCards = countCards(state);
  if (totalCards !== DECK_SIZE) {
    throw new Error(`Game state must have exactly ${DECK_SIZE} cards, found ${totalCards}`);
  }
  
  // Rule 2: Check for duplicate cards
  const duplicates = findDuplicates(state);
  if (duplicates.length > 0) {
    throw new Error(`Found duplicate cards: ${duplicates.join(', ')}`);
  }
  
  // Rule 3: Validate card properties (implicitly validated by TypeScript types)
  // Additional check: ensure all card IDs follow the expected format
  const validateCardId = (card: Card) => {
    const expectedId = `${card.suit}-${card.rank}`;
    if (card.id !== expectedId) {
      throw new Error(`Card has invalid ID: expected "${expectedId}", found "${card.id}"`);
    }
  };
  
  [...state.drawPile, ...state.discardPile].forEach(validateCardId);
  Object.values(state.foundations).flat().forEach(validateCardId);
  state.tableau.flat().forEach(validateCardId);
  
  // Rule 4 & 5: Validate foundation sequences
  const foundationSuits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
  for (const suit of foundationSuits) {
    const foundation = state.foundations[suit];
    
    // Check all cards in foundation match the suit
    for (const card of foundation) {
      if (card.suit !== suit) {
        throw new Error(`${suit} foundation contains card with suit ${card.suit}`);
      }
    }
    
    // Check sequence
    const error = validateFoundationSequence(foundation, suit);
    if (error) {
      throw new Error(error);
    }
  }
  
  // Rule 6: Validate tableau columns
  for (let i = 0; i < state.tableau.length; i++) {
    const error = validateTableauColumn(state.tableau[i], i);
    if (error) {
      throw new Error(error);
    }
  }
  
  // Validate difficulty is in range
  if (state.difficulty < 1 || state.difficulty > 5) {
    throw new Error(`Difficulty must be between 1 and 5, found ${state.difficulty}`);
  }
  
  // Validate completion progress
  if (state.completionProgress < 0 || state.completionProgress > 100) {
    throw new Error(`Completion progress must be between 0 and 100, found ${state.completionProgress}`);
  }
  
  // Validate perceived difficulty if present
  if (state.perceivedDifficulty !== undefined) {
    if (state.perceivedDifficulty < 0 || state.perceivedDifficulty > 100) {
      throw new Error(`Perceived difficulty must be between 0 and 100, found ${state.perceivedDifficulty}`);
    }
  }
}
