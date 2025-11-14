/**
 * Game state manipulation helpers
 * Functions for creating, hashing, and recording game state changes
 */

import type { GameState, Move } from '../../types';

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
