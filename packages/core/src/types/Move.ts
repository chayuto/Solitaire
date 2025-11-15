/**
 * Move type definitions
 * Represents actions that can be taken in the game
 */

import type { Card, Suit } from './Card';

/**
 * Types of moves that can be made in Klondike Solitaire
 */
export type MoveType = 
  | 'draw_card'             // Draw a card from the stock
  | 'recycle_stock'         // Recycle the waste pile back to stock
  | 'tableau_to_tableau'    // Move card(s) between tableau columns
  | 'tableau_to_foundation' // Move card from tableau to foundation
  | 'discard_to_tableau'    // Move card from waste pile to tableau
  | 'discard_to_foundation' // Move card from waste pile to foundation
  | 'flip_card';            // Flip a face-down card (internal)

/**
 * Represents a move in the game
 * Used for move history and undo/redo functionality
 */
export interface Move {
  /** The type of move */
  readonly type: MoveType;
  /** Timestamp when the move was made */
  readonly timestamp: number;
  /** The card(s) involved in the move */
  readonly card: Card;
  /** Source location of the move */
  readonly from?: {
    readonly source: 'tableau' | 'discard' | 'stock';
    readonly columnIndex?: number;
    readonly cardIndex?: number;
  };
  /** Destination location of the move */
  readonly to?: {
    readonly target: 'tableau' | 'foundation';
    readonly columnIndex?: number;
    readonly suit?: Suit;
  };
}

/**
 * Command for executing a move (before it's recorded in history)
 * More compact representation used by game engine
 */
export interface MoveCommand {
  readonly type: MoveType;
  readonly from?: {
    readonly column?: number;
    readonly cardIndex?: number;
  };
  readonly to?: {
    readonly column?: number;
    readonly suit?: Suit;
  };
}
