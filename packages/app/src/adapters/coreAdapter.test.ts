/**
 * Tests for state adapter between UI and Core GameState
 */

import { describe, it, expect } from 'vitest';
import { uiToCore, coreToUI, getDefaultUIFields } from './coreAdapter';
import type { GameState as UIGameState, Card } from '../types';

// Helper to create a minimal UI game state for testing
function createMockUIState(): UIGameState {
  const card: Card = {
    suit: 'hearts',
    rank: 'A',
    faceUp: true,
    id: 'hearts-A',
  };

  return {
    drawPile: [card],
    discardPile: [],
    foundations: {
      hearts: [],
      diamonds: [],
      clubs: [],
      spades: [],
    },
    tableau: [[], [], [], [], [], [], []],
    moveHistory: [],
    difficulty: 3,
    gameWon: false,
    completionProgress: 0,
    perceivedDifficulty: 50,
    selectedCard: undefined,
    showValidMoves: false,
    godMode: false,
    autoPlayEnabled: false,
    autoPlayInProgress: false,
    autoPlayStateHistory: undefined,
    replayMode: false,
    replayIndex: -1,
    replayPaused: false,
    replaySpeed: 1000,
  };
}

describe('coreAdapter', () => {
  describe('uiToCore', () => {
    it('should convert UI state to Core state', () => {
      const uiState = createMockUIState();
      const coreState = uiToCore(uiState);

      expect(coreState.drawPile).toEqual(uiState.drawPile);
      expect(coreState.discardPile).toEqual(uiState.discardPile);
      expect(coreState.foundations).toEqual(uiState.foundations);
      expect(coreState.tableau).toEqual(uiState.tableau);
      expect(coreState.moveHistory).toEqual(uiState.moveHistory);
      expect(coreState.difficulty).toBe(uiState.difficulty);
      expect(coreState.gameWon).toBe(uiState.gameWon);
      expect(coreState.completionProgress).toBe(uiState.completionProgress);
      expect(coreState.perceivedDifficulty).toBe(uiState.perceivedDifficulty);
    });

    it('should strip out UI-specific fields', () => {
      const uiState = createMockUIState();
      uiState.selectedCard = {
        source: 'tableau',
        columnIndex: 0,
        cardIndex: 0,
        card: uiState.drawPile[0],
      };
      uiState.showValidMoves = true;
      uiState.godMode = true;

      const coreState = uiToCore(uiState);

      expect('selectedCard' in coreState).toBe(false);
      expect('showValidMoves' in coreState).toBe(false);
      expect('godMode' in coreState).toBe(false);
      expect('autoPlayEnabled' in coreState).toBe(false);
      expect('replayMode' in coreState).toBe(false);
    });

    it('should handle initialBoardSetup', () => {
      const uiState = createMockUIState();
      const card: Card = {
        suit: 'diamonds',
        rank: 'K',
        faceUp: false,
        id: 'diamonds-K',
      };
      
      uiState.initialBoardSetup = {
        drawPile: [card],
        discardPile: [],
        foundations: {
          hearts: [],
          diamonds: [],
          clubs: [],
          spades: [],
        },
        tableau: [[], [], [], [], [], [], []],
      };

      const coreState = uiToCore(uiState);

      expect(coreState.initialBoardSetup).toBeDefined();
      expect(coreState.initialBoardSetup?.drawPile).toEqual([card]);
    });

    it('should handle undefined initialBoardSetup', () => {
      const uiState = createMockUIState();
      uiState.initialBoardSetup = undefined;

      const coreState = uiToCore(uiState);

      expect(coreState.initialBoardSetup).toBeUndefined();
    });
  });

  describe('coreToUI', () => {
    it('should convert Core state to UI state', () => {
      const uiState = createMockUIState();
      const coreState = uiToCore(uiState);
      const newUIState = coreToUI(coreState, uiState);

      expect(newUIState.drawPile).toEqual(uiState.drawPile);
      expect(newUIState.discardPile).toEqual(uiState.discardPile);
      expect(newUIState.foundations).toEqual(uiState.foundations);
      expect(newUIState.tableau).toEqual(uiState.tableau);
      expect(newUIState.moveHistory).toEqual(uiState.moveHistory);
      expect(newUIState.difficulty).toBe(uiState.difficulty);
      expect(newUIState.gameWon).toBe(uiState.gameWon);
      expect(newUIState.completionProgress).toBe(uiState.completionProgress);
    });

    it('should preserve UI-specific fields from existing state', () => {
      const uiState = createMockUIState();
      uiState.selectedCard = {
        source: 'tableau',
        columnIndex: 0,
        cardIndex: 0,
        card: uiState.drawPile[0],
      };
      uiState.showValidMoves = true;
      uiState.godMode = true;
      uiState.replayMode = true;

      const coreState = uiToCore(uiState);
      const newUIState = coreToUI(coreState, uiState);

      expect(newUIState.selectedCard).toEqual(uiState.selectedCard);
      expect(newUIState.showValidMoves).toBe(true);
      expect(newUIState.godMode).toBe(true);
      expect(newUIState.replayMode).toBe(true);
    });

    it('should create mutable arrays from readonly arrays', () => {
      const uiState = createMockUIState();
      const coreState = uiToCore(uiState);
      const newUIState = coreToUI(coreState, uiState);

      // Verify we can mutate the arrays (they're not readonly)
      expect(() => {
        newUIState.drawPile.push({
          suit: 'spades',
          rank: '2',
          faceUp: false,
          id: 'spades-2',
        });
      }).not.toThrow();
    });

    it('should handle initialBoardSetup conversion', () => {
      const uiState = createMockUIState();
      const card: Card = {
        suit: 'clubs',
        rank: 'Q',
        faceUp: true,
        id: 'clubs-Q',
      };
      
      uiState.initialBoardSetup = {
        drawPile: [card],
        discardPile: [],
        foundations: {
          hearts: [],
          diamonds: [],
          clubs: [],
          spades: [],
        },
        tableau: [[], [], [], [], [], [], []],
      };

      const coreState = uiToCore(uiState);
      const newUIState = coreToUI(coreState, uiState);

      expect(newUIState.initialBoardSetup).toBeDefined();
      expect(newUIState.initialBoardSetup?.drawPile).toEqual([card]);
    });
  });

  describe('getDefaultUIFields', () => {
    it('should return default UI field values', () => {
      const defaults = getDefaultUIFields();

      expect(defaults.selectedCard).toBeUndefined();
      expect(defaults.showValidMoves).toBe(false);
      expect(defaults.godMode).toBe(false);
      expect(defaults.autoPlayEnabled).toBe(false);
      expect(defaults.autoPlayInProgress).toBe(false);
      expect(defaults.autoPlayStateHistory).toBeUndefined();
      expect(defaults.replayMode).toBe(false);
      expect(defaults.replayIndex).toBe(-1);
      expect(defaults.replayPaused).toBe(false);
      expect(defaults.replaySpeed).toBe(1000);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve core game state through round-trip conversion', () => {
      const uiState = createMockUIState();
      const coreState = uiToCore(uiState);
      const newUIState = coreToUI(coreState, uiState);
      const finalCoreState = uiToCore(newUIState);

      // Core game state should be identical after round trip
      expect(finalCoreState.drawPile).toEqual(coreState.drawPile);
      expect(finalCoreState.discardPile).toEqual(coreState.discardPile);
      expect(finalCoreState.foundations).toEqual(coreState.foundations);
      expect(finalCoreState.tableau).toEqual(coreState.tableau);
      expect(finalCoreState.difficulty).toBe(coreState.difficulty);
      expect(finalCoreState.gameWon).toBe(coreState.gameWon);
      expect(finalCoreState.completionProgress).toBe(coreState.completionProgress);
    });

    it('should preserve UI fields through round-trip', () => {
      const uiState = createMockUIState();
      uiState.showValidMoves = true;
      uiState.godMode = true;
      uiState.replayMode = true;
      uiState.replayIndex = 5;

      const coreState = uiToCore(uiState);
      const newUIState = coreToUI(coreState, uiState);

      // UI-specific fields should be preserved
      expect(newUIState.showValidMoves).toBe(true);
      expect(newUIState.godMode).toBe(true);
      expect(newUIState.replayMode).toBe(true);
      expect(newUIState.replayIndex).toBe(5);
    });
  });
});
