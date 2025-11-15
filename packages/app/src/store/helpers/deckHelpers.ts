/**
 * Deck manipulation helpers
 * Handles creation, shuffling, and arrangement of card decks
 */

import type { Card, Suit, Rank, Difficulty } from '../../types';
import { 
  SUITS, 
  RANKS, 
  VERY_EASY_SHUFFLE_PERCENT, 
  EASY_SHUFFLE_PERCENT, 
  HARD_EXTRA_SHUFFLE_PERCENT 
} from '../../constants';

/**
 * Creates a single card with the given properties
 * @param suit - The suit of the card
 * @param rank - The rank of the card
 * @param faceUp - Whether the card should be face up (default: false)
 * @returns A new Card object
 */
export const createCard = (suit: Suit, rank: Rank, faceUp: boolean = false): Card => ({
  suit,
  rank,
  faceUp,
  id: `${suit}-${rank}`,
});

/**
 * Creates a full standard 52-card deck
 * All cards are created face down by default
 * @returns Array of 52 Card objects in standard order
 */
export const createDeck = (): Card[] => {
  const deck: Card[] = [];

  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push(createCard(suit, rank));
    });
  });

  return deck;
};

/**
 * Performs a Fisher-Yates shuffle on an array
 * This is a full random shuffle with uniform distribution
 * @param array - The array to shuffle
 * @returns A new shuffled array
 */
export const shuffle = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Performs a partial shuffle by swapping a percentage of elements
 * Used for difficulty levels that require controlled randomization
 * @param array - The array to partially shuffle
 * @param shufflePercentage - Percentage of swaps to perform (0-100+)
 * @returns A new partially shuffled array
 */
export const partialShuffle = <T,>(array: T[], shufflePercentage: number): T[] => {
  const result = [...array];
  const numSwaps = Math.floor((array.length * shufflePercentage) / 100);
  
  for (let i = 0; i < numSwaps; i++) {
    const idx1 = Math.floor(Math.random() * array.length);
    const idx2 = Math.floor(Math.random() * array.length);
    [result[idx1], result[idx2]] = [result[idx2], result[idx1]];
  }
  
  return result;
};

/**
 * Arranges a deck based on the specified difficulty level
 * Different difficulties use different shuffle strategies:
 * - Level 1 (Very Easy): 20% shuffle - mostly ordered
 * - Level 2 (Easy): 50% shuffle - partially ordered
 * - Level 3 (Normal): Full shuffle - completely random
 * - Level 4 (Hard): Full shuffle + 30% extra swaps
 * - Level 5 (Very Hard): Double shuffle for maximum entropy
 * 
 * @param difficulty - The difficulty level (1-5)
 * @returns A shuffled deck arranged according to difficulty
 */
export const arrangeDeckByDifficulty = (difficulty: Difficulty): Card[] => {
  const deck = createDeck();
  
  switch (difficulty) {
    case 1: // Very Easy - minimal shuffle with favorable arrangement
      return partialShuffle(deck, VERY_EASY_SHUFFLE_PERCENT);
    
    case 2: // Easy - partial shuffle
      return partialShuffle(deck, EASY_SHUFFLE_PERCENT);
    
    case 3: // Normal - full random shuffle (default)
      return shuffle(deck);
    
    case 4: // Hard - shuffle then bias towards blocking positions
      return partialShuffle(shuffle(deck), HARD_EXTRA_SHUFFLE_PERCENT);
    
    case 5: // Very Hard - double shuffle for maximum randomization
      return shuffle(shuffle(deck));
    
    default:
      return shuffle(deck);
  }
};
