/**
 * Game metrics calculation helpers
 * Computes difficulty scores and completion progress
 */

import type { GameState } from '../../types';
import { getRankValue, isRed } from './cardHelpers';
import { DECK_SIZE, TABLEAU_COLUMNS } from '../../constants';

/**
 * Calculates the perceived difficulty of a game based on initial board setup
 * Analyzes various factors to produce a score from 0-100 (higher = more difficult)
 * 
 * Factors considered:
 * - Buried low cards (Aces and 2s): 0-30 points
 * - Face-down card distribution: 0-25 points
 * - Empty columns: -5 points each (easier)
 * - Card sequence potential: 0-20 points (negative - more sequences = easier)
 * - Draw pile size: 0-10 points
 * 
 * @param initialBoardSetup - The initial board configuration
 * @returns Difficulty score 0-100, or undefined if no setup available
 */
export const calculatePerceivedDifficulty = (
  initialBoardSetup?: GameState['initialBoardSetup']
): number | undefined => {
  if (!initialBoardSetup) {
    return undefined;
  }

  let difficultyScore = 0;
  const { tableau, drawPile } = initialBoardSetup;

  // Factor 1: Buried aces and low cards (0-30 points)
  // Aces and 2s buried deep in tableau columns are harder to access
  let buriedLowCardsScore = 0;
  tableau.forEach(column => {
    column.forEach((card, index) => {
      if (!card.faceUp) {
        const rankValue = getRankValue(card.rank);
        // Aces and 2s are critical for starting foundations
        if (rankValue <= 2) {
          // Deeper burial = higher score (more difficult)
          const depthFactor = (column.length - index) / column.length;
          buriedLowCardsScore += depthFactor * 5; // Max 5 points per buried low card
        }
      }
    });
  });
  difficultyScore += Math.min(buriedLowCardsScore, 30);

  // Factor 2: Face-down card distribution (0-25 points)
  // More face-down cards = harder game
  let totalFaceDown = 0;
  tableau.forEach(column => {
    totalFaceDown += column.filter(card => !card.faceUp).length;
  });
  // There are 21 face-down cards in standard deal (0+1+2+3+4+5+6)
  const faceDownRatio = totalFaceDown / 21;
  difficultyScore += faceDownRatio * 25;

  // Factor 3: Empty columns (0-15 points)
  // Starting with empty columns is unusual and can be either easier or harder
  // We'll count it as slightly negative since it gives flexibility
  const emptyColumns = tableau.filter(col => col.length === 0).length;
  difficultyScore -= emptyColumns * 5; // Each empty column reduces difficulty

  // Factor 4: Card sequence potential (0-20 points)
  // Check how many cards in tableau can immediately form sequences
  let sequencePotential = 0;
  const faceUpCards = tableau.flatMap(col => col.filter(card => card.faceUp));
  faceUpCards.forEach(card => {
    const canFormSequence = faceUpCards.some(otherCard => 
      card !== otherCard &&
      isRed(card.suit) !== isRed(otherCard.suit) &&
      getRankValue(card.rank) === getRankValue(otherCard.rank) - 1
    );
    if (canFormSequence) {
      sequencePotential += 1;
    }
  });
  // More immediate sequences = easier game
  const maxPossibleSequences = TABLEAU_COLUMNS; // One per column
  difficultyScore -= (sequencePotential / maxPossibleSequences) * 20;

  // Factor 5: Draw pile size (0-10 points)
  // More cards in draw pile = more options but also more to work through
  const drawPileRatio = drawPile.length / 24; // 24 is standard draw pile size
  difficultyScore += drawPileRatio * 10;

  // Normalize to 0-100 range
  difficultyScore = Math.max(0, Math.min(100, difficultyScore));
  
  return Math.round(difficultyScore);
};

/**
 * Calculates game completion progress as a percentage (0-100%)
 * 
 * Primary metric: Cards in foundations (each card = ~1.92%)
 * Bonus metric: Additional face-up tableau cards (0.5% each, max 7%)
 * 
 * @param state - Current game state
 * @returns Completion percentage rounded to 1 decimal place
 */
export const calculateCompletionProgress = (state: GameState): number => {
  // Count cards in foundations (winning condition)
  const foundationCards = 
    state.foundations.hearts.length +
    state.foundations.diamonds.length +
    state.foundations.clubs.length +
    state.foundations.spades.length;
  
  // Basic progress: cards in foundation / total cards
  const basicProgress = (foundationCards / DECK_SIZE) * 100;
  
  // Bonus progress for face-up cards in tableau (showing progress even when not in foundation)
  const tableauFaceUpCards = state.tableau.reduce((count, column) => 
    count + column.filter(card => card.faceUp).length, 0
  );
  
  // Initial face-up cards in standard deal is 7 (one per column)
  // Additional face-up cards show progress in revealing the board
  const additionalFaceUp = Math.max(0, tableauFaceUpCards - TABLEAU_COLUMNS);
  
  // Give 0.5% bonus for each additional face-up card (max ~7 points for fully revealed board)
  const faceUpBonus = Math.min(additionalFaceUp * 0.5, 7);
  
  // Combine the scores
  const totalProgress = basicProgress + faceUpBonus;
  
  // Cap at 100% and round to 1 decimal place
  return Math.min(100, Math.round(totalProgress * 10) / 10);
};
