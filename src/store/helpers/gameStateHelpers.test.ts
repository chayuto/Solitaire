import { describe, it, expect } from 'vitest';
import { getGameStateHash, getStateHashAfterMove } from './gameStateHelpers';
import type { GameState, Card } from '../../types';

describe('gameStateHelpers', () => {
  describe('getGameStateHash', () => {
    it('should generate consistent hashes for the same state', () => {
      const state: GameState = {
        drawPile: [{ suit: 'hearts', rank: 'A', faceUp: false, id: 'hearts-A' }],
        discardPile: [],
        foundations: {
          hearts: [],
          diamonds: [],
          clubs: [],
          spades: [],
        },
        tableau: [
          [{ suit: 'spades', rank: '2', faceUp: true, id: 'spades-2' }],
          [],
          [],
          [],
          [],
          [],
          [],
        ],
        moveHistory: [],
        showValidMoves: true,
        godMode: false,
        autoPlayEnabled: false,
        autoPlayInProgress: false,
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };

      const hash1 = getGameStateHash(state);
      const hash2 = getGameStateHash(state);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different states', () => {
      const state1: GameState = {
        drawPile: [],
        discardPile: [],
        foundations: {
          hearts: [],
          diamonds: [],
          clubs: [],
          spades: [],
        },
        tableau: [
          [{ suit: 'hearts', rank: '5', faceUp: true, id: 'hearts-5' }],
          [],
          [],
          [],
          [],
          [],
          [],
        ],
        moveHistory: [],
        showValidMoves: true,
        godMode: false,
        autoPlayEnabled: false,
        autoPlayInProgress: false,
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };

      const state2: GameState = {
        ...state1,
        tableau: [
          [],
          [{ suit: 'hearts', rank: '5', faceUp: true, id: 'hearts-5' }],
          [],
          [],
          [],
          [],
          [],
        ],
      };

      const hash1 = getGameStateHash(state1);
      const hash2 = getGameStateHash(state2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getStateHashAfterMove', () => {
    it('should correctly predict state hash after tableau to tableau move', () => {
      const card: Card = { suit: 'hearts', rank: '5', faceUp: true, id: 'hearts-5' };
      
      const state: GameState = {
        drawPile: [],
        discardPile: [],
        foundations: {
          hearts: [],
          diamonds: [],
          clubs: [],
          spades: [],
        },
        tableau: [
          [card],
          [{ suit: 'clubs', rank: '6', faceUp: true, id: 'clubs-6' }],
          [],
          [],
          [],
          [],
          [],
        ],
        moveHistory: [],
        showValidMoves: true,
        godMode: false,
        autoPlayEnabled: false,
        autoPlayInProgress: false,
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };

      const predictedHash = getStateHashAfterMove(state, {
        card,
        source: 'tableau',
        sourceColumn: 0,
        sourceCardIndex: 0,
        targetType: 'tableau',
        targetColumn: 1,
      });

      // Now actually perform the move and get the hash
      const expectedState: GameState = {
        ...state,
        tableau: [
          [],
          [
            { suit: 'clubs', rank: '6', faceUp: true, id: 'clubs-6' },
            card,
          ],
          [],
          [],
          [],
          [],
          [],
        ],
      };

      const actualHash = getGameStateHash(expectedState);

      expect(predictedHash).toBe(actualHash);
    });

    it('should correctly predict state hash after discard to tableau move', () => {
      const card: Card = { suit: 'hearts', rank: '5', faceUp: true, id: 'hearts-5' };
      
      const state: GameState = {
        drawPile: [],
        discardPile: [card],
        foundations: {
          hearts: [],
          diamonds: [],
          clubs: [],
          spades: [],
        },
        tableau: [
          [{ suit: 'clubs', rank: '6', faceUp: true, id: 'clubs-6' }],
          [],
          [],
          [],
          [],
          [],
          [],
        ],
        moveHistory: [],
        showValidMoves: true,
        godMode: false,
        autoPlayEnabled: false,
        autoPlayInProgress: false,
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };

      const predictedHash = getStateHashAfterMove(state, {
        card,
        source: 'discard',
        targetType: 'tableau',
        targetColumn: 0,
      });

      // Now create the expected state
      const expectedState: GameState = {
        ...state,
        discardPile: [],
        tableau: [
          [
            { suit: 'clubs', rank: '6', faceUp: true, id: 'clubs-6' },
            card,
          ],
          [],
          [],
          [],
          [],
          [],
          [],
        ],
      };

      const actualHash = getGameStateHash(expectedState);

      expect(predictedHash).toBe(actualHash);
    });

    it('should correctly predict state hash after tableau to foundation move', () => {
      const card: Card = { suit: 'hearts', rank: 'A', faceUp: true, id: 'hearts-A' };
      
      const state: GameState = {
        drawPile: [],
        discardPile: [],
        foundations: {
          hearts: [],
          diamonds: [],
          clubs: [],
          spades: [],
        },
        tableau: [
          [card],
          [],
          [],
          [],
          [],
          [],
          [],
        ],
        moveHistory: [],
        showValidMoves: true,
        godMode: false,
        autoPlayEnabled: false,
        autoPlayInProgress: false,
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };

      const predictedHash = getStateHashAfterMove(state, {
        card,
        source: 'tableau',
        sourceColumn: 0,
        sourceCardIndex: 0,
        targetType: 'foundation',
        targetSuit: 'hearts',
      });

      // Create the expected state
      const expectedState: GameState = {
        ...state,
        tableau: [
          [],
          [],
          [],
          [],
          [],
          [],
          [],
        ],
        foundations: {
          hearts: [card],
          diamonds: [],
          clubs: [],
          spades: [],
        },
      };

      const actualHash = getGameStateHash(expectedState);

      expect(predictedHash).toBe(actualHash);
    });

    it('should correctly predict state hash with face-down card flip', () => {
      const card1: Card = { suit: 'hearts', rank: '5', faceUp: false, id: 'hearts-5' };
      const card2: Card = { suit: 'clubs', rank: '6', faceUp: true, id: 'clubs-6' };
      
      const state: GameState = {
        drawPile: [],
        discardPile: [],
        foundations: {
          hearts: [],
          diamonds: [],
          clubs: [],
          spades: [],
        },
        tableau: [
          [card1, card2],
          [{ suit: 'diamonds', rank: '7', faceUp: true, id: 'diamonds-7' }],
          [],
          [],
          [],
          [],
          [],
        ],
        moveHistory: [],
        showValidMoves: true,
        godMode: false,
        autoPlayEnabled: false,
        autoPlayInProgress: false,
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
      };

      const predictedHash = getStateHashAfterMove(state, {
        card: card2,
        source: 'tableau',
        sourceColumn: 0,
        sourceCardIndex: 1,
        targetType: 'tableau',
        targetColumn: 1,
      });

      // Create the expected state - card1 should be flipped
      const expectedState: GameState = {
        ...state,
        tableau: [
          [{ ...card1, faceUp: true }], // Card should be flipped
          [
            { suit: 'diamonds', rank: '7', faceUp: true, id: 'diamonds-7' },
            card2,
          ],
          [],
          [],
          [],
          [],
          [],
        ],
      };

      const actualHash = getGameStateHash(expectedState);

      expect(predictedHash).toBe(actualHash);
    });
  });
});
