/**
 * Game state manipulation helpers
 * Functions for creating, hashing, and recording game state changes
 */

import type { GameState, Move, Card, Suit } from '../../types';

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
