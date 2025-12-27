/**
 * Move selection strategy for auto-play
 * Collects possible moves, scores them, and selects the best one
 * 
 * @public
 */

import type { GameState, Suit } from '../types';
import type { PossibleMove, MoveSelectionResult } from './types';
import { scoreMove } from './scoring';
import { getStateHashAfterMove } from '../store/uiHelpers';
import {
  canMoveToTableau,
  canMoveToFoundation,
} from '@chayuto/solitaire-core';

/**
 * Collects all possible moves from the current game state
 * 
 * @param state - Current game state
 * @param canMoveToTableauFn - Function to check tableau move validity (defaults to using state.tableau)
 * @param canMoveToFoundationFn - Function to check foundation move validity (defaults to using state.foundations)
 * @returns Array of possible moves (unscored)
 * 
 * @public
 * @remarks The default parameters intentionally capture `state` from the function parameter.
 * This closure is evaluated at call time, ensuring correct behavior.
 */
export function collectPossibleMoves(
  state: GameState,
  canMoveToTableauFn: (card: GameState['tableau'][number][number], targetColumn: number) => boolean = 
    (card, targetColumn) => canMoveToTableau(card, state.tableau[targetColumn]),
  canMoveToFoundationFn: (card: GameState['tableau'][number][number], suit: Suit) => boolean =
    (card, suit) => canMoveToFoundation(card, state.foundations[suit])
): PossibleMove[] {
  const possibleMoves: PossibleMove[] = [];
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

  // Check discard pile moves
  if (state.discardPile.length > 0) {
    const card = state.discardPile[state.discardPile.length - 1];

    // Check foundation moves
    for (const suit of suits) {
      if (canMoveToFoundationFn(card, suit)) {
        possibleMoves.push({
          score: 0,
          card,
          source: 'discard',
          targetType: 'foundation',
          targetSuit: suit,
        });
      }
    }

    // Check tableau moves
    for (let targetCol = 0; targetCol < 7; targetCol++) {
      if (canMoveToTableauFn(card, targetCol)) {
        possibleMoves.push({
          score: 0,
          card,
          source: 'discard',
          targetType: 'tableau',
          targetColumn: targetCol,
        });
      }
    }
  }

  // Check tableau moves
  for (let col = 0; col < state.tableau.length; col++) {
    const column = state.tableau[col];
    for (let cardIndex = 0; cardIndex < column.length; cardIndex++) {
      const card = column[cardIndex];
      if (!card.faceUp) continue;

      // Check foundation moves (only for last card in column)
      if (cardIndex === column.length - 1) {
        for (const suit of suits) {
          if (canMoveToFoundationFn(card, suit)) {
            possibleMoves.push({
              score: 0,
              card,
              source: 'tableau',
              sourceColumn: col,
              sourceCardIndex: cardIndex,
              targetType: 'foundation',
              targetSuit: suit,
            });
          }
        }
      }

      // Check tableau moves
      for (let targetCol = 0; targetCol < 7; targetCol++) {
        if (targetCol === col) continue;
        if (canMoveToTableauFn(card, targetCol)) {
          possibleMoves.push({
            score: 0,
            card,
            source: 'tableau',
            sourceColumn: col,
            sourceCardIndex: cardIndex,
            targetType: 'tableau',
            targetColumn: targetCol,
          });
        }
      }
    }
  }

  return possibleMoves;
}

/**
 * Scores all possible moves using the scoring algorithm
 * 
 * @param moves - Array of possible moves to score
 * @param state - Current game state
 * @returns Moves with scores assigned
 * 
 * @public
 */
export function scoreMoves(moves: PossibleMove[], state: GameState): PossibleMove[] {
  return moves.map(move => ({
    ...move,
    score: scoreMove(move, state),
  }));
}

/**
 * Filters moves that would result in a previously seen state (loop detection)
 * 
 * @param moves - Array of possible moves
 * @param state - Current game state
 * @param stateHistory - History of state hashes
 * @returns Moves that would not create a loop
 * 
 * @public
 */
export function filterLoopingMoves(
  moves: PossibleMove[],
  state: GameState,
  stateHistory: string[]
): PossibleMove[] {
  return moves.filter(move => {
    const futureStateHash = getStateHashAfterMove(state, move);
    return !stateHistory.includes(futureStateHash);
  });
}

/**
 * Selects the best move from available options
 * 
 * @param state - Current game state
 * @param stateHistory - History of state hashes for loop detection
 * @param canMoveToTableauFn - Function to check tableau move validity
 * @param canMoveToFoundationFn - Function to check foundation move validity
 * @returns The best move or null with reason
 * 
 * @public
 */
export function selectBestMove(
  state: GameState,
  stateHistory: string[],
  canMoveToTableauFn?: (card: GameState['tableau'][number][number], targetColumn: number) => boolean,
  canMoveToFoundationFn?: (card: GameState['tableau'][number][number], suit: Suit) => boolean
): MoveSelectionResult {
  // Collect all possible moves
  const possibleMoves = collectPossibleMoves(state, canMoveToTableauFn, canMoveToFoundationFn);

  if (possibleMoves.length === 0) {
    return { move: null, reason: 'no_moves' };
  }

  // Score all moves
  const scoredMoves = scoreMoves(possibleMoves, state);

  // Filter out moves that would result in loops
  const nonLoopingMoves = filterLoopingMoves(scoredMoves, state, stateHistory);

  // If all moves would lead to loops, report loop detection
  if (nonLoopingMoves.length === 0) {
    return { move: null, reason: 'loop_detected' };
  }

  // Sort by score (highest first)
  nonLoopingMoves.sort((a, b) => b.score - a.score);

  // Filter out moves with negative scores (useless moves)
  const worthwhileMoves = nonLoopingMoves.filter(move => move.score > 0);

  if (worthwhileMoves.length === 0) {
    return { move: null, reason: 'no_moves' };
  }

  return { move: worthwhileMoves[0] };
}
