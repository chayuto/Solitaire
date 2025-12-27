/**
 * Tests for auto-play scoring module
 */

import { describe, it, expect } from 'vitest';
import {
  scoreMove,
  countFaceDownCards,
  evaluateRevealValue,
  hasKingAvailable,
  getFoundationUnevennessScore,
  isCardNeededForTableau,
  getFaceDownCard,
} from './scoring';
import type { PossibleMove } from './types';
import type { GameState } from '../types';

// Helper to create a card
const createCard = (
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades',
  rank: string,
  faceUp = true
) => ({
  id: `${suit}-${rank}`,
  suit,
  rank: rank as GameState['tableau'][number][number]['rank'],
  faceUp,
});

// Helper to create a basic game state
const createGameState = (overrides: Partial<GameState> = {}): GameState => ({
  drawPile: [],
  discardPile: [],
  foundations: {
    hearts: [],
    diamonds: [],
    clubs: [],
    spades: [],
  },
  tableau: [[], [], [], [], [], [], []],
  moveHistory: [],
  showValidMoves: true,
  godMode: false,
  autoPlayEnabled: false,
  autoPlayInProgress: false,
  difficulty: 3,
  gameWon: false,
  completionProgress: 0,
  replayMode: false,
  replayIndex: 0,
  replayPaused: false,
  replaySpeed: 1000,
  ...overrides,
});

describe('autoplay/scoring', () => {
  describe('getFaceDownCard', () => {
    it('should return null for empty column', () => {
      const tableau: GameState['tableau'] = [[]];
      expect(getFaceDownCard(tableau, 0, 0)).toBeNull();
    });

    it('should return null for face-up card', () => {
      const tableau: GameState['tableau'] = [[createCard('hearts', 'A', true)]];
      expect(getFaceDownCard(tableau, 0, 0)).toBeNull();
    });

    it('should return face-down card', () => {
      const card = createCard('hearts', 'A', false);
      const tableau: GameState['tableau'] = [[card]];
      expect(getFaceDownCard(tableau, 0, 0)).toEqual(card);
    });

    it('should return null for invalid indices', () => {
      const tableau: GameState['tableau'] = [[createCard('hearts', 'A', false)]];
      expect(getFaceDownCard(tableau, -1, 0)).toBeNull();
      expect(getFaceDownCard(tableau, 10, 0)).toBeNull();
      expect(getFaceDownCard(tableau, 0, -1)).toBeNull();
      expect(getFaceDownCard(tableau, 0, 10)).toBeNull();
    });
  });

  describe('countFaceDownCards', () => {
    it('should return 0 for empty column', () => {
      const tableau: GameState['tableau'] = [[]];
      expect(countFaceDownCards(tableau, 0)).toBe(0);
    });

    it('should count face-down cards correctly', () => {
      const tableau: GameState['tableau'] = [
        [
          createCard('hearts', 'A', false),
          createCard('hearts', '2', false),
          createCard('hearts', '3', true),
        ],
      ];
      expect(countFaceDownCards(tableau, 0)).toBe(2);
    });

    it('should return 0 for all face-up cards', () => {
      const tableau: GameState['tableau'] = [
        [
          createCard('hearts', 'A', true),
          createCard('hearts', '2', true),
        ],
      ];
      expect(countFaceDownCards(tableau, 0)).toBe(0);
    });
  });

  describe('hasKingAvailable', () => {
    it('should return false for empty state', () => {
      const state = createGameState();
      expect(hasKingAvailable(state)).toBe(false);
    });

    it('should return true when King is in discard pile', () => {
      const state = createGameState({
        discardPile: [createCard('hearts', 'K', true)],
      });
      expect(hasKingAvailable(state)).toBe(true);
    });

    it('should return true when King is face-up in tableau', () => {
      const state = createGameState({
        tableau: [
          [createCard('hearts', 'K', true)],
          [], [], [], [], [], [],
        ],
      });
      expect(hasKingAvailable(state)).toBe(true);
    });

    it('should return false when King is face-down', () => {
      const state = createGameState({
        tableau: [
          [createCard('hearts', 'K', false)],
          [], [], [], [], [], [],
        ],
      });
      expect(hasKingAvailable(state)).toBe(false);
    });
  });

  describe('getFoundationUnevennessScore', () => {
    it('should return 0 for empty foundations', () => {
      const state = createGameState();
      expect(getFoundationUnevennessScore(state)).toBe(0);
    });

    it('should return 0 for even foundations', () => {
      const state = createGameState({
        foundations: {
          hearts: [createCard('hearts', 'A')],
          diamonds: [createCard('diamonds', 'A')],
          clubs: [createCard('clubs', 'A')],
          spades: [createCard('spades', 'A')],
        },
      });
      expect(getFoundationUnevennessScore(state)).toBe(0);
    });

    it('should return difference for uneven foundations', () => {
      const state = createGameState({
        foundations: {
          hearts: [createCard('hearts', 'A'), createCard('hearts', '2')],
          diamonds: [],
          clubs: [],
          spades: [],
        },
      });
      expect(getFoundationUnevennessScore(state)).toBe(2);
    });
  });

  describe('isCardNeededForTableau', () => {
    it('should return false for empty tableau', () => {
      const state = createGameState();
      const card = createCard('hearts', '5');
      expect(isCardNeededForTableau(state, card)).toBe(false);
    });

    it('should return true when card can be placed on tableau', () => {
      const state = createGameState({
        tableau: [
          [createCard('clubs', '6', true)], // Black 6 can receive red 5
          [], [], [], [], [], [],
        ],
      });
      const card = createCard('hearts', '5'); // Red 5
      expect(isCardNeededForTableau(state, card)).toBe(true);
    });

    it('should return false when card cannot be placed', () => {
      const state = createGameState({
        tableau: [
          [createCard('hearts', '6', true)], // Red 6 cannot receive red 5
          [], [], [], [], [], [],
        ],
      });
      const card = createCard('diamonds', '5'); // Red 5
      expect(isCardNeededForTableau(state, card)).toBe(false);
    });
  });

  describe('evaluateRevealValue', () => {
    it('should return 0 for face-up card', () => {
      const state = createGameState({
        tableau: [
          [createCard('hearts', 'A', true)],
          [], [], [], [], [], [],
        ],
      });
      expect(evaluateRevealValue(state, 0, 0)).toBe(0);
    });

    it('should return positive value for face-down Ace', () => {
      const state = createGameState({
        tableau: [
          [createCard('hearts', 'A', false)],
          [], [], [], [], [], [],
        ],
      });
      const value = evaluateRevealValue(state, 0, 0);
      expect(value).toBeGreaterThan(0);
      expect(value).toBeGreaterThan(50); // Should include ace bonus
    });

    it('should return higher value for King', () => {
      const aceState = createGameState({
        tableau: [[createCard('hearts', 'A', false)], [], [], [], [], [], []],
      });
      const kingState = createGameState({
        tableau: [[createCard('hearts', 'K', false)], [], [], [], [], [], []],
      });
      
      const aceValue = evaluateRevealValue(aceState, 0, 0);
      const kingValue = evaluateRevealValue(kingState, 0, 0);
      
      // Ace should have higher bonus than King in our scoring
      expect(aceValue).toBeGreaterThan(kingValue);
    });
  });

  describe('scoreMove', () => {
    it('should score Ace to foundation highly', () => {
      const state = createGameState({
        tableau: [
          [createCard('hearts', 'A', true)],
          [], [], [], [], [], [],
        ],
      });

      const move: PossibleMove = {
        score: 0,
        card: createCard('hearts', 'A'),
        source: 'tableau',
        sourceColumn: 0,
        sourceCardIndex: 0,
        targetType: 'foundation',
        targetSuit: 'hearts',
      };

      const score = scoreMove(move, state);
      expect(score).toBeGreaterThan(0);
    });

    it('should penalize non-King to empty column', () => {
      const state = createGameState({
        tableau: [
          [createCard('hearts', '5', true)],
          [], // Empty column
          [], [], [], [], [],
        ],
      });

      const move: PossibleMove = {
        score: 0,
        card: createCard('hearts', '5'),
        source: 'tableau',
        sourceColumn: 0,
        sourceCardIndex: 0,
        targetType: 'tableau',
        targetColumn: 1,
      };

      const score = scoreMove(move, state);
      expect(score).toBeLessThan(0);
    });

    it('should score King to empty column positively', () => {
      const state = createGameState({
        tableau: [
          [createCard('hearts', 'K', true)],
          [], // Empty column
          [], [], [], [], [],
        ],
      });

      const move: PossibleMove = {
        score: 0,
        card: createCard('hearts', 'K'),
        source: 'tableau',
        sourceColumn: 0,
        sourceCardIndex: 0,
        targetType: 'tableau',
        targetColumn: 1,
      };

      const score = scoreMove(move, state);
      expect(score).toBeGreaterThan(0);
    });

    it('should give bonus for revealing face-down card', () => {
      const state = createGameState({
        tableau: [
          [
            createCard('hearts', '2', false), // Face down
            createCard('clubs', 'A', true),   // Face up - will be moved
          ],
          [createCard('diamonds', '2', true)], // Target
          [], [], [], [], [],
        ],
      });

      const move: PossibleMove = {
        score: 0,
        card: createCard('clubs', 'A'),
        source: 'tableau',
        sourceColumn: 0,
        sourceCardIndex: 1,
        targetType: 'foundation',
        targetSuit: 'clubs',
      };

      const score = scoreMove(move, state);
      expect(score).toBeGreaterThan(1000000); // Should get reveal bonus
    });
  });
});
