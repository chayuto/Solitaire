import { describe, it, expect } from 'vitest';
import {
  countCards,
  findDuplicates,
  isValidGameState,
  validateGameState,
} from './validation';
import { createDeck, arrangeDeckByDifficulty } from './deck';
import { createCard } from './card';
import type { GameState, Foundations } from '../types';

// Helper function to create a minimal valid game state
function createValidGameState(): GameState {
  const emptyFoundations: Foundations = {
    hearts: [],
    diamonds: [],
    clubs: [],
    spades: []
  };

  const deck = createDeck();
  
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

describe('Validation Utilities', () => {
  describe('countCards', () => {
    it('should count cards in a new game', () => {
      const state = createValidGameState();
      expect(countCards(state)).toBe(52);
    });

    it('should count cards in empty piles', () => {
      const emptyFoundations: Foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: []
      };

      const state: GameState = {
        drawPile: [],
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [[], [], [], [], [], [], []],
        moveHistory: [],
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };
      
      expect(countCards(state)).toBe(0);
    });

    it('should count cards across all piles', () => {
      const deck = createDeck();
      const emptyFoundations: Foundations = {
        hearts: [deck[0], deck[1]],
        diamonds: [deck[2]],
        clubs: [],
        spades: [deck[3], deck[4], deck[5]]
      };

      const state: GameState = {
        drawPile: [deck[6], deck[7]],
        discardPile: [deck[8], deck[9], deck[10]],
        foundations: emptyFoundations,
        tableau: [
          [deck[11], deck[12]],
          [deck[13]],
          [],
          [deck[14], deck[15], deck[16]],
          [],
          [deck[17]],
          []
        ],
        moveHistory: [],
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };
      
      expect(countCards(state)).toBe(18);
    });
  });

  describe('findDuplicates', () => {
    it('should find no duplicates in a valid game', () => {
      const state = createValidGameState();
      const duplicates = findDuplicates(state);
      expect(duplicates).toHaveLength(0);
    });

    it('should find duplicates in draw pile', () => {
      const state = createValidGameState();
      const card = createCard('hearts', 'A');
      state.drawPile = [card, card];
      state.discardPile = [];
      state.foundations = { hearts: [], diamonds: [], clubs: [], spades: [] };
      state.tableau = [[], [], [], [], [], [], []];
      
      const duplicates = findDuplicates(state);
      expect(duplicates).toContain('hearts-A');
    });

    it('should find duplicates across different piles', () => {
      const card = createCard('hearts', 'A');
      const emptyFoundations: Foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: []
      };

      const state: GameState = {
        drawPile: [card],
        discardPile: [card],
        foundations: emptyFoundations,
        tableau: [[], [], [], [], [], [], []],
        moveHistory: [],
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };
      
      const duplicates = findDuplicates(state);
      expect(duplicates).toContain('hearts-A');
    });

    it('should find multiple duplicates', () => {
      const card1 = createCard('hearts', 'A');
      const card2 = createCard('spades', 'K');
      const emptyFoundations: Foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: []
      };

      const state: GameState = {
        drawPile: [card1, card2],
        discardPile: [card1, card2],
        foundations: emptyFoundations,
        tableau: [[], [], [], [], [], [], []],
        moveHistory: [],
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };
      
      const duplicates = findDuplicates(state);
      expect(duplicates).toHaveLength(2);
      expect(duplicates).toContain('hearts-A');
      expect(duplicates).toContain('spades-K');
    });
  });

  describe('isValidGameState', () => {
    it('should return true for a valid game state', () => {
      const state = createValidGameState();
      expect(isValidGameState(state)).toBe(true);
    });

    it('should return false for invalid card count', () => {
      const state = createValidGameState();
      state.drawPile = state.drawPile.slice(0, -1); // Remove one card
      expect(isValidGameState(state)).toBe(false);
    });

    it('should return false for duplicate cards', () => {
      const state = createValidGameState();
      const card = createCard('hearts', 'A');
      state.drawPile = [card, card];
      state.discardPile = [];
      state.foundations = { hearts: [], diamonds: [], clubs: [], spades: [] };
      state.tableau = [[], [], [], [], [], [], []];
      expect(isValidGameState(state)).toBe(false);
    });

    it('should return false for invalid foundation sequence', () => {
      const state = createValidGameState();
      const card2 = createCard('hearts', '2');
      state.foundations.hearts = [card2]; // Should start with Ace
      state.drawPile = state.drawPile.slice(0, -1);
      expect(isValidGameState(state)).toBe(false);
    });
  });

  describe('validateGameState', () => {
    it('should not throw for a valid game state', () => {
      const state = createValidGameState();
      expect(() => validateGameState(state)).not.toThrow();
    });

    it('should throw for wrong number of cards', () => {
      const state = createValidGameState();
      state.drawPile = state.drawPile.slice(0, -1); // Remove one card
      
      expect(() => validateGameState(state))
        .toThrow('Game state must have exactly 52 cards');
    });

    it('should throw for duplicate cards', () => {
      const deck = createDeck();
      const emptyFoundations: Foundations = {
        hearts: [deck[0], deck[0]], // DUPLICATE deck[0]!
        diamonds: [],
        clubs: [],
        spades: []
      };

      const state: GameState = {
        drawPile: deck.slice(30), // Start from deck[30] to get 22 cards
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [
          [deck[1]],
          [deck[2], deck[3]],
          [deck[4], deck[5], deck[6]],
          [deck[7], deck[8], deck[9], deck[10]],
          [deck[11], deck[12], deck[13], deck[14], deck[15]],
          [deck[16], deck[17], deck[18], deck[19], deck[20], deck[21]],
          [deck[22], deck[23], deck[24], deck[25], deck[26], deck[27], deck[28]],
        ],
        moveHistory: [],
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };
      
      expect(() => validateGameState(state))
        .toThrow('Found duplicate cards');
    });

    it('should throw for wrong number of tableau columns', () => {
      const state = createValidGameState();
      // @ts-expect-error - Testing invalid state
      state.tableau = [[], [], [], [], []]; // Only 5 columns
      
      expect(() => validateGameState(state))
        .toThrow('Tableau must have exactly 7 columns');
    });

    it('should throw for foundation not starting with Ace', () => {
      const deck = createDeck();
      //deck[1] is hearts-2 - use it for foundation
      const emptyFoundations: Foundations = {
        hearts: [deck[1]], // hearts-2, should start with Ace
        diamonds: [],
        clubs: [],
        spades: []
      };

      const state: GameState = {
        drawPile: deck.slice(28),
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [
          [deck[0]],
          [deck[2]],
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
      
      expect(() => validateGameState(state))
        .toThrow('hearts foundation must start with an Ace');
    });

    it('should throw for foundation with wrong suit', () => {
      const deck = createDeck();
      // deck[13] is diamonds-A - use it in wrong foundation
      const emptyFoundations: Foundations = {
        hearts: [deck[13]], // Wrong suit - should be hearts
        diamonds: [],
        clubs: [],
        spades: []
      };

      const state: GameState = {
        drawPile: deck.slice(28),
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [
          [deck[0]],
          [deck[1], deck[2]],
          [deck[3], deck[4], deck[5]],
          [deck[6], deck[7], deck[8], deck[9]],
          [deck[10], deck[11], deck[12]],
          [deck[14], deck[15], deck[16], deck[17], deck[18], deck[19]],
          [deck[20], deck[21], deck[22], deck[23], deck[24], deck[25], deck[26], deck[27]],
        ],
        moveHistory: [],
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };
      
      expect(() => validateGameState(state))
        .toThrow('hearts foundation contains card with suit diamonds');
    });

    it('should throw for foundation with non-sequential cards', () => {
      const deck = createDeck();
      // deck[0] is hearts-A, deck[2] is hearts-3 - skip hearts-2
      const emptyFoundations: Foundations = {
        hearts: [deck[0], deck[2]], // A, 3 - missing 2
        diamonds: [],
        clubs: [],
        spades: []
      };

      const state: GameState = {
        drawPile: deck.slice(28),
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [
          [], // Skip deck[0] and [2]
          [deck[1]],
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
      
      expect(() => validateGameState(state))
        .toThrow('hearts foundation has card 3 at position 1');
    });

    it('should validate a correct foundation sequence', () => {
      const deck = createDeck();
      // deck[0] = hearts-A, deck[1] = hearts-2, deck[2] = hearts-3
      const emptyFoundations: Foundations = {
        hearts: [deck[0], deck[1], deck[2]],
        diamonds: [],
        clubs: [],
        spades: []
      };

      const state: GameState = {
        drawPile: deck.slice(28),
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [
          [], // Skip deck[0], [1], [2]
          [],
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
      
      expect(() => validateGameState(state)).not.toThrow();
    });

    it('should throw for face-down card after face-up card in tableau', () => {
      const deck = createDeck();
      // Flip deck[0] to face up and create a face down version of deck[1]
      const faceUpCard = { ...deck[0], faceUp: true };
      const faceDownCard = { ...deck[28], faceUp: false };
      const emptyFoundations: Foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: []
      };

      const state: GameState = {
        drawPile: deck.slice(29),
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [
          [faceUpCard, faceDownCard], // Invalid order
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
      
      expect(() => validateGameState(state))
        .toThrow('Tableau column 0 has face-down card at position 1');
    });

    it('should allow all face-down cards in tableau', () => {
      const deck = createDeck();
      // Both cards face down (already default in deck)
      const emptyFoundations: Foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: []
      };

      const state: GameState = {
        drawPile: deck.slice(28),
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [
          [deck[0], deck[1]],
          [deck[2]],
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
      
      expect(() => validateGameState(state)).not.toThrow();
    });

    it('should allow all face-up cards in tableau', () => {
      const deck = createDeck();
      // Flip cards to face up
      const card1 = { ...deck[0], faceUp: true };
      const card2 = { ...deck[1], faceUp: true };
      const emptyFoundations: Foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: []
      };

      const state: GameState = {
        drawPile: deck.slice(28),
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [
          [card1, card2],
          [deck[2]],
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
      
      expect(() => validateGameState(state)).not.toThrow();
    });

    it('should allow face-down then face-up cards in tableau', () => {
      const deck = createDeck();
      // deck[0] and deck[1] face down, deck[2] face up
      const card3 = { ...deck[2], faceUp: true };
      const emptyFoundations: Foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: []
      };

      const state: GameState = {
        drawPile: deck.slice(28),
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [
          [deck[0], deck[1], card3],
          [],
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
      
      expect(() => validateGameState(state)).not.toThrow();
    });

    it('should throw for invalid difficulty', () => {
      const state = createValidGameState();
      // @ts-expect-error - Testing invalid value
      state.difficulty = 0;
      
      expect(() => validateGameState(state))
        .toThrow('Difficulty must be between 1 and 5');
    });

    it('should throw for invalid completion progress', () => {
      const state = createValidGameState();
      state.completionProgress = 150;
      
      expect(() => validateGameState(state))
        .toThrow('Completion progress must be between 0 and 100');
    });

    it('should throw for invalid perceived difficulty', () => {
      const state = createValidGameState();
      state.perceivedDifficulty = -10;
      
      expect(() => validateGameState(state))
        .toThrow('Perceived difficulty must be between 0 and 100');
    });

    it('should validate a complete valid game state', () => {
      const deck = arrangeDeckByDifficulty(3, 42);
      const emptyFoundations: Foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: []
      };

      const state: GameState = {
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
      
      expect(() => validateGameState(state)).not.toThrow();
    });
  });
});
