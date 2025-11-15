/**
 * Deck utility functions
 * Functions for creating, shuffling, and arranging decks of cards
 * All functions are pure and do not mutate input arrays
 */

import type { Card, Difficulty } from '../types';
import { SUITS, RANKS, createCard } from './card';

/**
 * Difficulty-based shuffle percentages
 * Used for partial shuffling to control game difficulty
 */
const VERY_EASY_SHUFFLE_PERCENT = 20;
const EASY_SHUFFLE_PERCENT = 50;
const HARD_EXTRA_SHUFFLE_PERCENT = 30;

/**
 * Simple seeded random number generator (LCG - Linear Congruential Generator)
 * Using parameters from Numerical Recipes
 * @param seed - The seed value
 * @returns A random number generator function
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    // LCG parameters from Numerical Recipes
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Creates a full standard 52-card deck
 * All cards are created face down by default
 * Cards are in a standard order: hearts A-K, diamonds A-K, clubs A-K, spades A-K
 * @param faceUp - Whether cards should be face up (default: false)
 * @returns Array of 52 Card objects in standard order
 */
export function createDeck(faceUp: boolean = false): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(suit, rank, faceUp));
    }
  }

  return deck;
}

/**
 * Performs a Fisher-Yates shuffle on an array
 * This is a full random shuffle with uniform distribution
 * @param array - The array to shuffle
 * @param seed - Optional seed for reproducible shuffles
 * @returns A new shuffled array
 */
export function shuffle<T>(array: readonly T[], seed?: number): T[] {
  const shuffled = [...array];
  const random = seed !== undefined ? createSeededRandom(seed) : Math.random;
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Shuffles a deck of cards
 * @param deck - The deck to shuffle
 * @param seed - Optional seed for reproducible shuffles
 * @returns A new shuffled deck
 */
export function shuffleDeck(deck: readonly Card[], seed?: number): Card[] {
  return shuffle(deck, seed);
}

/**
 * Performs a partial shuffle by swapping a percentage of elements
 * Used for difficulty levels that require controlled randomization
 * @param array - The array to partially shuffle
 * @param shufflePercentage - Percentage of swaps to perform (0-100+)
 * @param seed - Optional seed for reproducible shuffles
 * @returns A new partially shuffled array
 */
export function partialShuffle<T>(
  array: readonly T[],
  shufflePercentage: number,
  seed?: number
): T[] {
  const result = [...array];
  const random = seed !== undefined ? createSeededRandom(seed) : Math.random;
  const numSwaps = Math.floor((array.length * shufflePercentage) / 100);
  
  for (let i = 0; i < numSwaps; i++) {
    const idx1 = Math.floor(random() * array.length);
    const idx2 = Math.floor(random() * array.length);
    [result[idx1], result[idx2]] = [result[idx2], result[idx1]];
  }
  
  return result;
}

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
 * @param seed - Optional seed for reproducible games
 * @returns A shuffled deck arranged according to difficulty
 */
export function arrangeDeckByDifficulty(difficulty: Difficulty, seed?: number): Card[] {
  const deck = createDeck();
  
  switch (difficulty) {
    case 1: // Very Easy - minimal shuffle with favorable arrangement
      return partialShuffle(deck, VERY_EASY_SHUFFLE_PERCENT, seed);
    
    case 2: // Easy - partial shuffle
      return partialShuffle(deck, EASY_SHUFFLE_PERCENT, seed);
    
    case 3: // Normal - full random shuffle (default)
      return shuffle(deck, seed);
    
    case 4: // Hard - shuffle then bias towards blocking positions
      return partialShuffle(shuffle(deck, seed), HARD_EXTRA_SHUFFLE_PERCENT, seed);
    
    case 5: // Very Hard - double shuffle for maximum randomization
      return shuffle(shuffle(deck, seed), seed);
    
    default:
      return shuffle(deck, seed);
  }
}
