/**
 * Tests for the UI → Core state projection.
 *
 * Since stage-1c the adapter is a plain field pick (the app's types ARE
 * core's), so the contract is: every core field projected, every UI/AI extra
 * stripped, array references shared (no copying).
 */

import { describe, it, expect } from 'vitest';
import { uiToCore } from './coreAdapter';
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
    eventLog: [{ type: 'autoplay_start', timestamp: 1, atMoveIndex: 0 }],
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
    it('projects every core game-state field', () => {
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

    it('strips UI- and AI-specific fields', () => {
      const uiState = createMockUIState();
      const coreState = uiToCore(uiState) as unknown as Record<string, unknown>;

      for (const uiOnly of [
        'selectedCard',
        'eventLog',
        'showValidMoves',
        'godMode',
        'autoPlayEnabled',
        'autoPlayInProgress',
        'autoPlayStateHistory',
        'replayMode',
        'replayIndex',
        'replayPaused',
        'replaySpeed',
        'aiConfig',
        'aiThinking',
        'aiDecisionLog',
      ]) {
        expect(coreState).not.toHaveProperty(uiOnly);
      }
    });

    it('shares array references instead of copying (pure projection)', () => {
      const uiState = createMockUIState();
      const coreState = uiToCore(uiState);

      expect(coreState.drawPile).toBe(uiState.drawPile);
      expect(coreState.tableau).toBe(uiState.tableau);
      expect(coreState.foundations).toBe(uiState.foundations);
      expect(coreState.moveHistory).toBe(uiState.moveHistory);
    });

    it('passes initialBoardSetup through, including undefined', () => {
      const withSetup = createMockUIState();
      withSetup.initialBoardSetup = {
        drawPile: [],
        discardPile: [],
        foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
        tableau: [[], [], [], [], [], [], []],
      };
      expect(uiToCore(withSetup).initialBoardSetup).toBe(withSetup.initialBoardSetup);

      const withoutSetup = createMockUIState();
      expect(uiToCore(withoutSetup).initialBoardSetup).toBeUndefined();
    });
  });
});
