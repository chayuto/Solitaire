/**
 * Difficulty system configuration for Solitaire
 * Controls deck shuffling algorithms based on difficulty level
 */

import type { Difficulty } from '../types';

/**
 * Shuffle percentages for each difficulty level
 * Lower values = less randomization (easier)
 * Higher values = more randomization (harder)
 */
export const DIFFICULTY_SHUFFLE_CONFIG: Record<Difficulty, { 
  name: string; 
  label: string;
  description: string;
}> = {
  1: { 
    name: 'Very Easy', 
    label: '⭐',
    description: 'Minimal shuffle (20% randomization) - Best for beginners'
  },
  2: { 
    name: 'Easy', 
    label: '⭐⭐',
    description: 'Partial shuffle (50% randomization) - Casual gameplay'
  },
  3: { 
    name: 'Normal', 
    label: '⭐⭐⭐',
    description: 'Full random shuffle - Classic Solitaire experience'
  },
  4: { 
    name: 'Hard', 
    label: '⭐⭐⭐⭐',
    description: 'Enhanced shuffle (130% randomization) - Challenging positions'
  },
  5: { 
    name: 'Very Hard', 
    label: '⭐⭐⭐⭐⭐',
    description: 'Double shuffle (200% randomization) - Expert level'
  },
} as const;

/**
 * Default difficulty level (Normal)
 */
export const DEFAULT_DIFFICULTY: Difficulty = 3;

/**
 * Partial shuffle percentage for Very Easy
 */
export const VERY_EASY_SHUFFLE_PERCENT = 20;

/**
 * Partial shuffle percentage for Easy
 */
export const EASY_SHUFFLE_PERCENT = 50;

/**
 * Partial shuffle percentage for Hard (additional swaps after full shuffle)
 */
export const HARD_EXTRA_SHUFFLE_PERCENT = 30;
