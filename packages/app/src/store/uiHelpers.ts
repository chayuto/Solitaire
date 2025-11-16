/**
 * UI-specific game helpers
 * Functions that are specific to the UI layer and not part of core game logic
 */

import type { GameState, Card, Suit, Move } from '../types';
import {
  canMoveToTableau,
  canMoveToFoundation,
  hasValidFoundationDestination,
  SUITS,
} from '@chayuto/solitaire-core';

/**
 * Records a move in the game's move history
 * @param state - Current game state
 * @param move - The move to record
 * @returns Updated move history array
 */
export const recordMove = (state: GameState, move: Move): Move[] => {
  return [...state.moveHistory, move];
};

/**
 * Generates a hash of the current game state for loop detection
 * Creates a simplified representation focusing on card positions
 * @param state - Current game state
 * @returns JSON string representing the game state
 */
export const getGameStateHash = (state: GameState): string => {
  // Create a simplified representation of the game state
  const stateSnapshot = {
    drawPile: state.drawPile.map(c => c.id),
    discardPile: state.discardPile.map(c => c.id),
    foundations: {
      hearts: state.foundations.hearts.map(c => c.id),
      diamonds: state.foundations.diamonds.map(c => c.id),
      clubs: state.foundations.clubs.map(c => c.id),
      spades: state.foundations.spades.map(c => c.id),
    },
    tableau: state.tableau.map(col => col.map(c => ({ id: c.id, faceUp: c.faceUp }))),
  };
  return JSON.stringify(stateSnapshot);
};

/**
 * Simulates a move and returns the resulting state hash without actually changing state
 * Used for predictive loop detection in autoplay
 * @param state - Current game state
 * @param move - The move to simulate
 * @returns Hash of the state that would result from this move
 */
export const getStateHashAfterMove = (
  state: GameState,
  move: {
    card: Card;
    source: 'tableau' | 'discard';
    sourceColumn?: number;
    sourceCardIndex?: number;
    targetType: 'foundation' | 'tableau';
    targetColumn?: number;
    targetSuit?: Suit;
  }
): string => {
  // Clone the relevant parts of the state
  const newDrawPile = [...state.drawPile];
  const newDiscardPile = [...state.discardPile];
  const newFoundations = {
    hearts: [...state.foundations.hearts],
    diamonds: [...state.foundations.diamonds],
    clubs: [...state.foundations.clubs],
    spades: [...state.foundations.spades],
  };
  const newTableau = state.tableau.map(col => [...col]);

  // Simulate the move
  if (move.targetType === 'foundation' && move.targetSuit) {
    // Move to foundation
    if (move.source === 'tableau' && move.sourceColumn !== undefined) {
      newTableau[move.sourceColumn] = newTableau[move.sourceColumn].slice(0, -1);
      
      // Flip the last card if it exists and is face down
      if (newTableau[move.sourceColumn].length > 0) {
        const lastCard = newTableau[move.sourceColumn][newTableau[move.sourceColumn].length - 1];
        if (!lastCard.faceUp) {
          newTableau[move.sourceColumn][newTableau[move.sourceColumn].length - 1] = {
            ...lastCard,
            faceUp: true,
          };
        }
      }
    } else if (move.source === 'discard') {
      newDiscardPile.pop();
    }
    newFoundations[move.targetSuit].push(move.card);
  } else if (move.targetType === 'tableau' && move.targetColumn !== undefined) {
    // Move to tableau
    if (move.source === 'tableau' && move.sourceColumn !== undefined && move.sourceCardIndex !== undefined) {
      const cardsToMove = newTableau[move.sourceColumn].slice(move.sourceCardIndex);
      newTableau[move.sourceColumn] = newTableau[move.sourceColumn].slice(0, move.sourceCardIndex);
      
      // Flip the last card if it exists and is face down
      if (newTableau[move.sourceColumn].length > 0) {
        const lastCard = newTableau[move.sourceColumn][newTableau[move.sourceColumn].length - 1];
        if (!lastCard.faceUp) {
          newTableau[move.sourceColumn][newTableau[move.sourceColumn].length - 1] = {
            ...lastCard,
            faceUp: true,
          };
        }
      }
      
      newTableau[move.targetColumn].push(...cardsToMove);
    } else if (move.source === 'discard') {
      newDiscardPile.pop();
      newTableau[move.targetColumn].push(move.card);
    }
  }

  // Create the hash from the simulated state
  const stateSnapshot = {
    drawPile: newDrawPile.map(c => c.id),
    discardPile: newDiscardPile.map(c => c.id),
    foundations: {
      hearts: newFoundations.hearts.map(c => c.id),
      diamonds: newFoundations.diamonds.map(c => c.id),
      clubs: newFoundations.clubs.map(c => c.id),
      spades: newFoundations.spades.map(c => c.id),
    },
    tableau: newTableau.map(col => col.map(c => ({ id: c.id, faceUp: c.faceUp }))),
  };
  return JSON.stringify(stateSnapshot);
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
    
    if (canMoveToTableau(card, tableau[col])) {
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
      if (canMoveToFoundation(discardCard, state.foundations[suit])) {
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
