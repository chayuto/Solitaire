/**
 * Move scoring logic for auto-play
 * Evaluates moves based on strategic priorities
 * 
 * @public
 */

import type { Card, GameState } from '../types';
import type { PossibleMove } from './types';
import { getRankValue, isRed } from '@chayuto/solitaire-core';
import { AUTOPLAY_SCORING } from '../constants/autoplay';

const S = AUTOPLAY_SCORING;

/**
 * Gets a face-down card at a specific position in tableau
 * @internal
 */
export function getFaceDownCard(
  tableau: Card[][],
  colIndex: number,
  cardIndex: number
): Card | null {
  if (colIndex < 0 || colIndex >= tableau.length) return null;
  const column = tableau[colIndex];
  if (cardIndex < 0 || cardIndex >= column.length) return null;
  const card = column[cardIndex];
  return !card.faceUp ? card : null;
}

/**
 * Counts face-down cards in a tableau column
 * @internal
 */
export function countFaceDownCards(tableau: Card[][], colIndex: number): number {
  if (colIndex < 0 || colIndex >= tableau.length) return 0;
  return tableau[colIndex].filter(card => !card.faceUp).length;
}

/**
 * Evaluates the value of revealing a face-down card
 * @internal
 */
export function evaluateRevealValue(
  state: GameState,
  colIndex: number,
  cardIndex: number
): number {
  const revealedCard = getFaceDownCard(state.tableau, colIndex, cardIndex);
  if (!revealedCard) return 0;

  let value = S.REVEAL_BASE_VALUE;

  // Higher value for revealing high-value cards
  if (revealedCard.rank === 'K') value += S.REVEAL_KING_BONUS;
  if (revealedCard.rank === 'Q') value += S.REVEAL_QUEEN_BONUS;
  if (revealedCard.rank === 'J') value += S.REVEAL_JACK_BONUS;
  if (revealedCard.rank === 'A') value += S.REVEAL_ACE_BONUS;

  // Bonus for revealing cards that could fit on current tableau
  const cardValue = getRankValue(revealedCard.rank);
  for (let col = 0; col < state.tableau.length; col++) {
    if (col === colIndex) continue;
    const column = state.tableau[col];
    if (column.length > 0) {
      const topCard = column[column.length - 1];
      if (topCard.faceUp) {
        const topValue = getRankValue(topCard.rank);
        if (cardValue === topValue - 1 && isRed(revealedCard.suit) !== isRed(topCard.suit)) {
          value += S.REVEAL_PLAYABLE_BONUS;
        }
      }
    }
  }

  // Bonus if this is the last face-down card in the column
  if (countFaceDownCards(state.tableau, colIndex) === 1) {
    value += S.REVEAL_LAST_FACE_DOWN_BONUS;
  }

  return value;
}

/**
 * Checks if there's a King available (face-up) in tableau or discard
 * @internal
 */
export function hasKingAvailable(state: GameState): boolean {
  // Check discard pile
  if (state.discardPile.length > 0) {
    const topCard = state.discardPile[state.discardPile.length - 1];
    if (topCard.rank === 'K') return true;
  }
  // Check tableau
  for (const column of state.tableau) {
    for (const card of column) {
      if (card.faceUp && card.rank === 'K') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculates foundation unevenness score
 * Higher = more uneven foundations
 * @internal
 */
export function getFoundationUnevennessScore(state: GameState): number {
  const levels = [
    state.foundations.hearts.length,
    state.foundations.diamonds.length,
    state.foundations.clubs.length,
    state.foundations.spades.length,
  ];
  const max = Math.max(...levels);
  const min = Math.min(...levels);
  return max - min;
}

/**
 * Checks if a card is needed for tableau building
 * @internal
 */
export function isCardNeededForTableau(state: GameState, card: Card): boolean {
  const cardValue = getRankValue(card.rank);
  
  for (let col = 0; col < state.tableau.length; col++) {
    const column = state.tableau[col];
    if (column.length > 0) {
      const topCard = column[column.length - 1];
      if (topCard.faceUp) {
        const topValue = getRankValue(topCard.rank);
        // This card could be placed on the top card
        if (cardValue === topValue - 1 && isRed(card.suit) !== isRed(topCard.suit)) {
          return true;
        }
      }
    }
    // Check if any face-down card underneath would need this card
    for (let i = 0; i < column.length; i++) {
      const hiddenCard = getFaceDownCard(state.tableau, col, i);
      if (hiddenCard) {
        const hiddenValue = getRankValue(hiddenCard.rank);
        if (hiddenValue === cardValue - 1 && isRed(hiddenCard.suit) !== isRed(card.suit)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Scores a move based on strategic priorities
 * 
 * Priority levels:
 * - Priority #1: Unlock Tableau (1000000+ points)
 * - Priority #2: King Management (100000+ points)
 * - Priority #3: Foundation Handling (10000+ points)
 * - Priority #4: Draw Pile Management (1000+ points)
 * - Priority #5: Flexibility (100+ points)
 * 
 * @public
 */
export function scoreMove(move: PossibleMove, state: GameState): number {
  let score = 0;
  const { source, sourceColumn, sourceCardIndex, targetType, targetColumn } = move;
  const cardValue = getRankValue(move.card.rank);

  // PRIORITY #1: UNLOCK THE TABLEAU (1000000+)
  if (source === 'tableau') {
    const revealsCard =
      sourceColumn !== undefined &&
      sourceCardIndex !== undefined &&
      sourceCardIndex > 0 &&
      !state.tableau[sourceColumn][sourceCardIndex - 1].faceUp;

    if (revealsCard) {
      score += S.REVEAL_CARD_BONUS;

      // Prioritize moves from columns with MORE face-down cards
      if (sourceColumn !== undefined) {
        const faceDownCount = countFaceDownCards(state.tableau, sourceColumn);
        score += faceDownCount * S.FACE_DOWN_PRIORITY_MULTIPLIER;
      }

      // Extra bonus based on what's revealed
      if (sourceColumn !== undefined && sourceCardIndex !== undefined) {
        score += S.REVEAL_BASE_BONUS;
        const revealValue = evaluateRevealValue(state, sourceColumn, sourceCardIndex - 1);
        score += revealValue * S.REVEAL_VALUE_SCALE;
      }
    } else {
      score += S.NO_REVEAL_BASE;

      // Penalty for moving single cards without revealing
      if (targetType === 'tableau' && sourceCardIndex !== undefined && sourceColumn !== undefined) {
        const numCardsMoving = state.tableau[sourceColumn].length - sourceCardIndex;
        if (numCardsMoving === 1) {
          score -= S.USELESS_SINGLE_MOVE_PENALTY;
        }
      }
    }
  } else {
    score += S.DISCARD_SOURCE_BASE;
  }

  // PRIORITY #2: KING MANAGEMENT (100000+)
  if (targetType === 'tableau' && targetColumn !== undefined) {
    const targetCol = state.tableau[targetColumn];

    if (targetCol.length === 0) {
      if (move.card.rank === 'K') {
        score += S.KING_TO_EMPTY_BONUS;

        // Prefer Kings from columns with MORE face-down cards
        if (source === 'tableau' && sourceColumn !== undefined) {
          const faceDownCount = countFaceDownCards(state.tableau, sourceColumn);
          score += faceDownCount * S.KING_FACE_DOWN_MULTIPLIER;
        }

        // Strategic King placement
        for (let col = 0; col < state.tableau.length; col++) {
          if (col === sourceColumn) continue;
          const column = state.tableau[col];
          for (let i = column.length - 1; i >= 0; i--) {
            const card = column[i];
            if (card.faceUp && getRankValue(card.rank) === 12) {
              if (isRed(card.suit) !== isRed(move.card.suit)) {
                score += S.KING_UNBLOCKS_QUEEN_BONUS;
              }
            }
          }
        }
      } else {
        score -= S.NON_KING_TO_EMPTY_PENALTY;
      }
    }

    // Check if this move would empty a column
    if (source === 'tableau' && sourceColumn !== undefined && sourceCardIndex === 0) {
      if (!hasKingAvailable(state)) {
        score -= S.NO_KING_AVAILABLE_PENALTY;
      }
    }
  }

  // PRIORITY #3: FOUNDATION HANDLING (10000+)
  if (targetType === 'foundation') {
    if (move.card.rank === 'A') {
      score += S.ACE_TO_FOUNDATION;
    } else if (move.card.rank === '2') {
      score += S.TWO_TO_FOUNDATION;
    } else if (cardValue <= 4) {
      if (isCardNeededForTableau(state, move.card)) {
        score += S.LOW_CARD_NEEDED;
      } else {
        score += S.LOW_CARD_NOT_NEEDED;
      }
    } else {
      if (isCardNeededForTableau(state, move.card)) {
        score -= S.HIGH_CARD_NEEDED_PENALTY;
      } else {
        score += S.HIGH_CARD_NOT_NEEDED;
      }
    }

    // Foundation evenness check
    const currentUnevenness = getFoundationUnevennessScore(state);
    const newLevel = state.foundations[move.card.suit].length + 1;
    const otherLevels = [
      state.foundations.hearts.length,
      state.foundations.diamonds.length,
      state.foundations.clubs.length,
      state.foundations.spades.length,
    ].filter((_, i) => ['hearts', 'diamonds', 'clubs', 'spades'][i] !== move.card.suit);
    otherLevels.push(newLevel);
    const maxLevel = Math.max(...otherLevels);
    const minLevel = Math.min(...otherLevels);
    const newUnevenness = maxLevel - minLevel;

    if (newUnevenness > currentUnevenness) {
      score -= (newUnevenness - currentUnevenness) * S.FOUNDATION_EVENNESS_PENALTY;
    }
  }

  // PRIORITY #4: DRAW PILE MANAGEMENT (1000+)
  if (source === 'discard') {
    if (targetType === 'foundation') {
      score -= S.DRAW_PILE_FOUNDATION_PENALTY;
    } else if (targetType === 'tableau') {
      score -= S.DRAW_PILE_TABLEAU_PENALTY;

      const targetCol = state.tableau[targetColumn!];

      if (move.card.rank === 'K' && targetCol.length === 0) {
        score += S.DRAW_PILE_KING_EXCEPTION;
      }

      const targetFaceDownCount = countFaceDownCards(state.tableau, targetColumn!);
      if (targetFaceDownCount > S.UNLOCK_THRESHOLD_FACE_DOWN) {
        score += S.DRAW_PILE_UNLOCK_BONUS;
      }
    }
  }

  // PRIORITY #5: FLEXIBILITY AND OPTIONS (100+)
  if (targetType === 'tableau' && targetColumn !== undefined) {
    const targetCol = state.tableau[targetColumn];

    if (targetCol.length > 0) {
      score += S.BUILD_ON_COLUMN_BONUS;

      const numCardsToMove =
        source === 'tableau' && sourceColumn !== undefined && sourceCardIndex !== undefined
          ? state.tableau[sourceColumn].length - sourceCardIndex
          : 1;
      score += numCardsToMove * S.CARDS_MOVING_BONUS;

      if (source === 'tableau' && sourceColumn !== undefined) {
        let targetHasRed = false;
        let targetHasBlack = false;
        for (const card of targetCol) {
          if (card.faceUp) {
            if (isRed(card.suit)) targetHasRed = true;
            else targetHasBlack = true;
          }
        }

        const movingIsRed = isRed(move.card.suit);
        if ((movingIsRed && !targetHasRed) || (!movingIsRed && !targetHasBlack)) {
          score += S.SUIT_DIVERSITY_BONUS;
        }
      }

      const targetFaceDownCount = countFaceDownCards(state.tableau, targetColumn);
      if (targetFaceDownCount <= 2) {
        score += S.NEARLY_CLEAR_COLUMN_BONUS;
      }
    }
  }

  return score;
}
