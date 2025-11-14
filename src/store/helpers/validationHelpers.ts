/**
 * Move validation helpers
 * Checks if moves are valid according to Solitaire rules
 */

import type { Card, GameState, Suit } from '../../types';
import { canPlaceOnTableauCard, canPlaceOnFoundation, canStartTableauColumn } from './cardHelpers';
import { SUITS } from '../../constants';

/**
 * Checks if a card can be moved to a specific tableau column
 * @param card - The card to move
 * @param targetColumn - The column to move to
 * @param tableau - Current tableau state
 * @returns true if the move is valid
 */
export const canMoveToTableau = (card: Card, targetColumn: number, tableau: Card[][]): boolean => {
  const column = tableau[targetColumn];
  
  // Empty column can only accept Kings
  if (column.length === 0) {
    return canStartTableauColumn(card);
  }
  
  // Get the last card in the target column
  const targetCard = column[column.length - 1];
  
  // Must be face up
  if (!targetCard.faceUp) {
    return false;
  }
  
  // Check if card can be placed on target
  return canPlaceOnTableauCard(card, targetCard);
};

/**
 * Checks if a card can be moved to a specific foundation pile
 * @param card - The card to move
 * @param suit - The foundation suit
 * @param foundations - Current foundations state
 * @returns true if the move is valid
 */
export const canMoveToFoundation = (
  card: Card, 
  suit: Suit, 
  foundations: GameState['foundations']
): boolean => {
  // Must match suit
  if (card.suit !== suit) {
    return false;
  }
  
  const foundation = foundations[suit];
  return canPlaceOnFoundation(card, foundation);
};

/**
 * Checks if a card has any valid destination in the tableau
 * @param card - The card to check
 * @param tableau - Current tableau state
 * @param sourceColumn - Optional source column to exclude from check
 * @returns true if at least one valid tableau destination exists
 */
export const hasValidTableauDestination = (
  card: Card, 
  tableau: Card[][], 
  sourceColumn?: number
): boolean => {
  // Check all tableau columns for valid destinations
  for (let col = 0; col < tableau.length; col++) {
    // Skip the source column if provided
    if (sourceColumn !== undefined && col === sourceColumn) {
      continue;
    }
    
    if (canMoveToTableau(card, col, tableau)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Checks if a card has any valid destination in the foundations
 * @param card - The card to check
 * @param foundations - Current foundations state
 * @returns true if at least one valid foundation destination exists
 */
export const hasValidFoundationDestination = (
  card: Card, 
  foundations: GameState['foundations']
): boolean => {
  // Check all foundations for valid destinations
  for (const suit of SUITS) {
    if (canMoveToFoundation(card, suit, foundations)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Checks if a card has any valid destination (tableau or foundation)
 * @param card - The card to check
 * @param source - Where the card is coming from
 * @param state - Current game state
 * @param columnIndex - Optional tableau column index
 * @param cardIndex - Optional card index within column
 * @returns true if at least one valid destination exists
 */
export const hasAnyValidDestination = (
  card: Card,
  source: 'tableau' | 'discard',
  state: GameState,
  columnIndex?: number,
  cardIndex?: number
): boolean => {
  // For tableau cards, only check if it's a valid moveable card
  if (source === 'tableau' && columnIndex !== undefined && cardIndex !== undefined) {
    const column = state.tableau[columnIndex];
    
    // Must be face up
    if (!card.faceUp) {
      return false;
    }
    
    // Check if this is the last card (can go to foundation or tableau)
    if (cardIndex === column.length - 1) {
      return (
        hasValidFoundationDestination(card, state.foundations) || 
        hasValidTableauDestination(card, state.tableau, columnIndex)
      );
    }
    
    // If not the last card, can only move to tableau (not foundation)
    return hasValidTableauDestination(card, state.tableau, columnIndex);
  }
  
  // For discard pile, check both foundation and tableau
  if (source === 'discard') {
    return (
      hasValidFoundationDestination(card, state.foundations) || 
      hasValidTableauDestination(card, state.tableau)
    );
  }
  
  return false;
};

/**
 * Checks if any valid moves exist in the current game state
 * Used to detect when the game is in an unwinnable state
 * @param state - Current game state
 * @returns true if at least one valid move exists
 */
export const hasAnyValidMoves = (state: GameState): boolean => {
  // Check if discard pile has any valid moves
  if (state.discardPile.length > 0) {
    const discardCard = state.discardPile[state.discardPile.length - 1];
    
    // Check foundation
    for (const suit of SUITS) {
      if (canMoveToFoundation(discardCard, suit, state.foundations)) {
        return true;
      }
    }
    
    // Check tableau
    if (hasValidTableauDestination(discardCard, state.tableau)) {
      return true;
    }
  }
  
  // Check tableau cards
  for (let col = 0; col < state.tableau.length; col++) {
    const column = state.tableau[col];
    for (let cardIndex = 0; cardIndex < column.length; cardIndex++) {
      const card = column[cardIndex];
      if (!card.faceUp) continue;
      
      // Check if can move to foundation (only last card)
      if (cardIndex === column.length - 1) {
        if (hasValidFoundationDestination(card, state.foundations)) {
          return true;
        }
      }
      
      // Check if can move to another tableau column
      if (hasValidTableauDestination(card, state.tableau, col)) {
        return true;
      }
    }
  }
  
  // Check if we can draw more cards
  if (state.drawPile.length > 0) {
    return true;
  }
  
  // Check if we can reset the draw pile
  if (state.drawPile.length === 0 && state.discardPile.length > 0) {
    return true;
  }
  
  return false;
};

/**
 * Checks if the game is won (all 52 cards in foundations)
 * @param state - Current game state
 * @returns true if game is won
 */
export const isGameWon = (state: GameState): boolean => {
  const totalCardsInFoundations = 
    state.foundations.hearts.length +
    state.foundations.diamonds.length +
    state.foundations.clubs.length +
    state.foundations.spades.length;
  return totalCardsInFoundations === 52;
};

/**
 * Checks if auto-complete can be triggered
 * Conditions: Draw pile empty, all tableau cards face up, and at least one card can move to foundation
 * @param state - Current game state
 * @returns true if auto-complete is possible
 */
export const canAutoComplete = (state: GameState): boolean => {
  // Draw pile must be empty
  if (state.drawPile.length > 0) {
    return false;
  }
  
  // All tableau cards must be face up
  for (const column of state.tableau) {
    for (const card of column) {
      if (!card.faceUp) {
        return false;
      }
    }
  }
  
  // Check if there's at least one card that can be moved to foundation
  for (const column of state.tableau) {
    if (column.length > 0) {
      const card = column[column.length - 1];
      if (hasValidFoundationDestination(card, state.foundations)) {
        return true;
      }
    }
  }
  
  // Also check discard pile
  if (state.discardPile.length > 0) {
    const card = state.discardPile[state.discardPile.length - 1];
    if (hasValidFoundationDestination(card, state.foundations)) {
      return true;
    }
  }
  
  return false;
};
