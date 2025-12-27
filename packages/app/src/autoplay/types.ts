/**
 * Type definitions for Auto-play module
 * Defines interfaces for move scoring and auto-play state
 * 
 * @public
 */

import type { Card, Suit } from '../types';

/**
 * Represents a possible move that can be made in the game
 * Used by the auto-play system to evaluate and select moves
 * 
 * @public
 */
export interface PossibleMove {
  /** Score assigned to this move (higher = better) */
  score: number;
  /** The card being moved */
  card: Card;
  /** Source location of the card */
  source: 'tableau' | 'discard';
  /** Source column index (for tableau source) */
  sourceColumn?: number;
  /** Card index within source column (for tableau source) */
  sourceCardIndex?: number;
  /** Target location type */
  targetType: 'foundation' | 'tableau';
  /** Target column index (for tableau target) */
  targetColumn?: number;
  /** Target suit (for foundation target) */
  targetSuit?: Suit;
}

/**
 * Scored move with explanation
 * Extended interface for debugging and explainability
 * 
 * @public
 */
export interface ScoredMove {
  /** The move being scored */
  move: PossibleMove;
  /** Final computed score */
  score: number;
  /** Explanation of scoring factors */
  reasons: string[];
}

/**
 * State for auto-play loop detection
 * Tracks game state history to prevent infinite loops
 * 
 * @internal
 */
export interface LoopDetectionState {
  /** History of state hashes */
  stateHistory: string[];
  /** Whether a loop has been detected */
  loopDetected: boolean;
}

/**
 * Result of move selection
 * Contains the selected move or reason for no selection
 * 
 * @public
 */
export interface MoveSelectionResult {
  /** The selected move, or null if no valid move */
  move: PossibleMove | null;
  /** Reason if no move was selected */
  reason?: 'no_moves' | 'loop_detected' | 'deadend';
}
