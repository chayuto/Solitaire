/**
 * Type definitions for Solitaire core library
 * All types are immutable (readonly) to enforce functional programming patterns
 */

// Card types
export type { Card, Suit, Rank } from './Card';

// Difficulty type
export type { Difficulty } from './Difficulty';

// Move types
export type { Move, MoveType, MoveCommand } from './Move';

// Game state types
export type { GameState, Foundations, InitializeOptions } from './GameState';
