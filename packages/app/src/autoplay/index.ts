/**
 * Auto-play module for Solitaire
 * Provides AI-based move selection and scoring for automated gameplay
 * 
 * @module autoplay
 * @public
 */

// Type exports
export type {
  PossibleMove,
  ScoredMove,
  LoopDetectionState,
  MoveSelectionResult,
} from './types';

// Scoring exports
export {
  scoreMove,
  countFaceDownCards,
  evaluateRevealValue,
  hasKingAvailable,
  getFoundationUnevennessScore,
  isCardNeededForTableau,
  getFaceDownCard,
} from './scoring';

// Strategy exports
export {
  collectPossibleMoves,
  scoreMoves,
  filterLoopingMoves,
  selectBestMove,
} from './strategy';
