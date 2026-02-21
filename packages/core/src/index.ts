/**
 * @chayuto/solitaire-core
 * Core game logic library for Klondike Solitaire
 * 
 * This library provides pure, immutable functions and types for implementing
 * Klondike Solitaire. It includes:
 * - Type definitions for cards, game state, and moves
 * - Utility functions for card and deck manipulation
 * - Game state validation
 * - State hashing for cycle detection
 * 
 * All functions are pure and do not mutate input data.
 */

export const VERSION = '0.1.0';

// Type exports
export type {
  Card,
  Suit,
  Rank,
  Difficulty,
  Move,
  MoveType,
  MoveCommand,
  GameState,
  Foundations,
  InitializeOptions,
} from './types';

// Game constants
export {
  DECK_SIZE,
  TABLEAU_COLUMNS,
  CARDS_PER_SUIT,
  NUM_SUITS,
  TABLEAU_INITIAL_CARDS,
} from './constants';

// Utility exports
export {
  // Card utilities
  SUITS,
  RANKS,
  RANK_VALUES,
  RED_SUITS,
  BLACK_SUITS,
  isRed,
  isRedCard,
  isBlack,
  isBlackCard,
  getColor,
  getCardColor,
  getRankValue,
  compareRanks,
  createCard,
  flipCard,
  areOppositeColors,
  areSameColor,
  
  // Deck utilities
  createDeck,
  shuffle,
  shuffleDeck,
  partialShuffle,
  arrangeDeckByDifficulty,
  
  // Validation utilities
  countCards,
  findDuplicates,
  isValidGameState,
  validateGameState,
  
  // Hash utilities
  hashGameState,
  hashGameStateMultiple,
  areStatesEqual,
} from './utils';

// Game engine
export { GameEngine } from './engine';

// Game rules
export {
  // Tableau rules
  canMoveToTableau,
  canMoveSequence,
  getValidTableauDestinations,
  
  // Foundation rules
  canMoveToFoundation,
  getNextFoundationRank,
  hasValidFoundationDestination,
  
  // Stock rules
  canDraw,
  draw,
  canRecycle,
  recycle,
} from './rules';

// Scoring functions
export {
  getCompletionProgress,
  getPerceivedDifficulty,
} from './scoring';
