import { describe, it, expect } from 'vitest';
import {
  hashGameState,
  hashGameStateMultiple,
  areStatesEqual,
} from './hash';
import { createDeck, arrangeDeckByDifficulty } from './deck';
import type { GameState, Foundations } from '../types';

// Helper function to create a test game state
function createTestGameState(seed: number = 42): GameState {
  const deck = arrangeDeckByDifficulty(3, seed);
  const emptyFoundations: Foundations = {
    hearts: [],
    diamonds: [],
    clubs: [],
    spades: []
  };

  return {
    drawPile: deck.slice(28),
    discardPile: [],
    foundations: emptyFoundations,
    tableau: [
      [deck[0]],
      [deck[1], deck[2]],
      [deck[3], deck[4], deck[5]],
      [deck[6], deck[7], deck[8], deck[9]],
      [deck[10], deck[11], deck[12], deck[13], deck[14]],
      [deck[15], deck[16], deck[17], deck[18], deck[19], deck[20]],
      [deck[21], deck[22], deck[23], deck[24], deck[25], deck[26], deck[27]],
    ],
    moveHistory: [],
    difficulty: 3,
    gameWon: false,
    completionProgress: 0,
  };
}

describe('Hash Utilities', () => {
  describe('hashGameState', () => {
    it('should return a consistent hash for the same state', () => {
      const state = createTestGameState(42);
      const hash1 = hashGameState(state);
      const hash2 = hashGameState(state);
      
      expect(hash1).toBe(hash2);
    });

    it('should return a string', () => {
      const state = createTestGameState();
      const hash = hashGameState(state);
      
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should return different hashes for different states', () => {
      const state1 = createTestGameState(42);
      const state2 = createTestGameState(123);
      
      const hash1 = hashGameState(state1);
      const hash2 = hashGameState(state2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should ignore move history', () => {
      const state1 = createTestGameState();
      const state2 = { ...state1, moveHistory: [
        {
          type: 'draw_card' as const,
          timestamp: Date.now(),
          card: state1.drawPile[0],
        }
      ]};
      
      const hash1 = hashGameState(state1);
      const hash2 = hashGameState(state2);
      
      expect(hash1).toBe(hash2);
    });

    it('should ignore difficulty level', () => {
      const state1 = createTestGameState();
      const state2 = { ...state1, difficulty: 5 as const };
      
      const hash1 = hashGameState(state1);
      const hash2 = hashGameState(state2);
      
      expect(hash1).toBe(hash2);
    });

    it('should ignore completion progress', () => {
      const state1 = createTestGameState();
      const state2 = { ...state1, completionProgress: 50 };
      
      const hash1 = hashGameState(state1);
      const hash2 = hashGameState(state2);
      
      expect(hash1).toBe(hash2);
    });

    it('should detect changes in draw pile', () => {
      const state1 = createTestGameState();
      const state2 = { ...state1, drawPile: state1.drawPile.slice(1) };
      
      const hash1 = hashGameState(state1);
      const hash2 = hashGameState(state2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should detect changes in discard pile', () => {
      const state1 = createTestGameState();
      const card = state1.drawPile[0];
      const state2 = {
        ...state1,
        discardPile: [card],
      };
      
      const hash1 = hashGameState(state1);
      const hash2 = hashGameState(state2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should detect changes in foundations', () => {
      const state1 = createTestGameState();
      const card = state1.drawPile[0];
      const state2 = {
        ...state1,
        foundations: {
          ...state1.foundations,
          hearts: [card],
        },
      };
      
      const hash1 = hashGameState(state1);
      const hash2 = hashGameState(state2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should detect changes in tableau', () => {
      const state1 = createTestGameState();
      const newTableau = [...state1.tableau];
      newTableau[0] = [...newTableau[0], newTableau[1][0]];
      const state2 = {
        ...state1,
        tableau: newTableau,
      };
      
      const hash1 = hashGameState(state1);
      const hash2 = hashGameState(state2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should detect face-up/face-down changes', () => {
      const state1 = createTestGameState();
      const flippedCard = { ...state1.tableau[0][0], faceUp: !state1.tableau[0][0].faceUp };
      const state2 = {
        ...state1,
        tableau: [[flippedCard], ...state1.tableau.slice(1)],
      };
      
      const hash1 = hashGameState(state1);
      const hash2 = hashGameState(state2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should be fast for typical game states', () => {
      const state = createTestGameState();
      const iterations = 1000;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        hashGameState(state);
      }
      const end = performance.now();
      
      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(1); // Should be < 1ms per hash
    });
  });

  describe('hashGameStateMultiple', () => {
    it('should return an array of hashes', () => {
      const state = createTestGameState();
      const hashes = hashGameStateMultiple(state);
      
      expect(Array.isArray(hashes)).toBe(true);
      expect(hashes.length).toBeGreaterThan(1);
    });

    it('should return consistent hashes', () => {
      const state = createTestGameState(42);
      const hashes1 = hashGameStateMultiple(state);
      const hashes2 = hashGameStateMultiple(state);
      
      expect(hashes1).toEqual(hashes2);
    });

    it('should include the primary hash as the first element', () => {
      const state = createTestGameState();
      const primaryHash = hashGameState(state);
      const multipleHashes = hashGameStateMultiple(state);
      
      expect(multipleHashes[0]).toBe(primaryHash);
    });

    it('should return different hash arrays for different states', () => {
      const state1 = createTestGameState(42);
      const state2 = createTestGameState(123);
      
      const hashes1 = hashGameStateMultiple(state1);
      const hashes2 = hashGameStateMultiple(state2);
      
      expect(hashes1).not.toEqual(hashes2);
    });
  });

  describe('areStatesEqual', () => {
    it('should return true for identical states', () => {
      const state1 = createTestGameState(42);
      const state2 = createTestGameState(42);
      
      expect(areStatesEqual(state1, state2)).toBe(true);
    });

    it('should return false for different states', () => {
      const state1 = createTestGameState(42);
      const state2 = createTestGameState(123);
      
      expect(areStatesEqual(state1, state2)).toBe(false);
    });

    it('should return true even if move history differs', () => {
      const state1 = createTestGameState();
      const state2 = {
        ...state1,
        moveHistory: [{
          type: 'draw_card' as const,
          timestamp: Date.now(),
          card: state1.drawPile[0],
        }],
      };
      
      expect(areStatesEqual(state1, state2)).toBe(true);
    });

    it('should return false when card positions differ', () => {
      const state1 = createTestGameState();
      const state2 = {
        ...state1,
        drawPile: state1.drawPile.slice(1),
      };
      
      expect(areStatesEqual(state1, state2)).toBe(false);
    });
  });

  describe('Hash collision resistance', () => {
    it('should have low collision rate for random states', () => {
      const hashes = new Set<string>();
      const numStates = 1000;
      
      for (let i = 0; i < numStates; i++) {
        const state = createTestGameState(i);
        const hash = hashGameState(state);
        hashes.add(hash);
      }
      
      const collisionRate = (numStates - hashes.size) / numStates;
      expect(collisionRate).toBeLessThan(0.01); // < 1% collision rate
    });

    it('should produce different hashes for similar states', () => {
      const deck = createDeck();
      const emptyFoundations: Foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: []
      };

      // Create two states that differ by one card
      const state1: GameState = {
        drawPile: [deck[0]],
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [[], [], [], [], [], [], []],
        moveHistory: [],
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };

      const state2: GameState = {
        drawPile: [deck[1]], // Different card
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [[], [], [], [], [], [], []],
        moveHistory: [],
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };

      const hash1 = hashGameState(state1);
      const hash2 = hashGameState(state2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Hash performance', () => {
    it('should hash a complex state quickly', () => {
      const state = createTestGameState();
      
      const start = performance.now();
      hashGameState(state);
      const end = performance.now();
      
      const time = end - start;
      expect(time).toBeLessThan(5); // Should be < 5ms
    });

    it('should handle multiple hashes efficiently', () => {
      const states = Array.from({ length: 100 }, (_, i) => createTestGameState(i));
      
      const start = performance.now();
      states.forEach(state => hashGameState(state));
      const end = performance.now();
      
      const avgTime = (end - start) / states.length;
      expect(avgTime).toBeLessThan(2); // Should be < 2ms per hash
    });
  });
});
