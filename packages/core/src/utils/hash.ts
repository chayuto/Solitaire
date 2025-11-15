/**
 * State hashing utilities
 * Fast, deterministic hashing for cycle detection and state comparison
 * Uses FNV-1a algorithm for good distribution and low collision rates
 */

import type { GameState, Card } from '../types';

/**
 * FNV-1a hash constants
 * FNV (Fowler-Noll-Vo) is a fast, non-cryptographic hash function
 */
const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

/**
 * FNV-1a hash function
 * Fast, simple hash with good distribution properties
 * @param str - String to hash
 * @returns Hash as a base-36 string
 */
function fnv1a(str: string): string {
  let hash = FNV_OFFSET_BASIS;
  
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  
  // Convert to unsigned 32-bit integer and then to base-36 string
  return (hash >>> 0).toString(36);
}

/**
 * Creates a canonical string representation of the game state
 * Only includes information relevant for state comparison:
 * - Card positions (which cards are where)
 * - Card face-up/face-down status
 * Excludes: move history, difficulty, scores, etc.
 * 
 * @param state - The game state to serialize
 * @returns A canonical string representation
 */
function serializeGameState(state: GameState): string {
  const parts: string[] = [];
  
  // Draw pile: just the card IDs in order
  parts.push('D:' + state.drawPile.map(c => c.id).join(','));
  
  // Discard pile: card IDs in order
  parts.push('W:' + state.discardPile.map(c => c.id).join(','));
  
  // Foundations: card IDs for each suit
  parts.push('FH:' + state.foundations.hearts.map(c => c.id).join(','));
  parts.push('FD:' + state.foundations.diamonds.map(c => c.id).join(','));
  parts.push('FC:' + state.foundations.clubs.map(c => c.id).join(','));
  parts.push('FS:' + state.foundations.spades.map(c => c.id).join(','));
  
  // Tableau: for each column, include card IDs and face-up status
  for (let i = 0; i < state.tableau.length; i++) {
    const column = state.tableau[i];
    const columnStr = column.map(c => `${c.id}${c.faceUp ? 'U' : 'D'}`).join(',');
    parts.push(`T${i}:${columnStr}`);
  }
  
  return parts.join('|');
}

/**
 * Generates a hash of the current game state for cycle detection
 * The hash is based only on card positions and face-up/down status
 * Two states with the same card arrangement will produce the same hash
 * 
 * @param state - The game state to hash
 * @returns A hash string (base-36 encoded)
 */
export function hashGameState(state: GameState): string {
  const serialized = serializeGameState(state);
  return fnv1a(serialized);
}

/**
 * Generates multiple hash values for improved collision detection
 * Returns an array of hashes using different serialization strategies
 * Useful for critical applications where hash collisions must be minimized
 * 
 * @param state - The game state to hash
 * @returns Array of hash strings
 */
export function hashGameStateMultiple(state: GameState): string[] {
  const hashes: string[] = [];
  
  // Primary hash: full state
  hashes.push(hashGameState(state));
  
  // Secondary hash: just card positions (ignore face-up/down)
  const foundationPiles = Object.values(state.foundations);
  const positionOnly = {
    D: state.drawPile.map(c => c.id).join(','),
    W: state.discardPile.map(c => c.id).join(','),
    F: foundationPiles.map(pile => pile.map((card: Card) => card.id).join(',')).join('|'),
    T: state.tableau.map(col => col.map((card: Card) => card.id).join(',')).join('|'),
  };
  hashes.push(fnv1a(JSON.stringify(positionOnly)));
  
  return hashes;
}

/**
 * Compares two game states for equality based on their hashes
 * This is much faster than deep object comparison
 * 
 * @param state1 - First game state
 * @param state2 - Second game state
 * @returns true if states are equivalent
 */
export function areStatesEqual(state1: GameState, state2: GameState): boolean {
  return hashGameState(state1) === hashGameState(state2);
}
