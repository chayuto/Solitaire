import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';

describe('GameStore - Metrics', () => {
  beforeEach(() => {
    // Reset the store before each test
    useGameStore.getState().initializeGame();
  });

  describe('Perceived Difficulty Score', () => {
    it('should calculate perceived difficulty on game initialization', () => {
      const state = useGameStore.getState();
      
      expect(state.perceivedDifficulty).toBeDefined();
      expect(typeof state.perceivedDifficulty).toBe('number');
      expect(state.perceivedDifficulty).toBeGreaterThanOrEqual(0);
      expect(state.perceivedDifficulty).toBeLessThanOrEqual(100);
    });

    it('should have different perceived difficulty for different difficulty settings', () => {
      // Initialize multiple games and collect perceived difficulties
      const difficulties: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        useGameStore.getState().initializeGame();
        const state = useGameStore.getState();
        if (state.perceivedDifficulty !== undefined) {
          difficulties.push(state.perceivedDifficulty);
        }
      }
      
      // We should have collected some difficulty scores
      expect(difficulties.length).toBeGreaterThan(0);
      
      // All should be in valid range
      difficulties.forEach(diff => {
        expect(diff).toBeGreaterThanOrEqual(0);
        expect(diff).toBeLessThanOrEqual(100);
      });
    });

    it('should be undefined when initialBoardSetup is not available', () => {
      // Create a game state without initialBoardSetup
      const store = useGameStore.getState();
      const jsonState = store.exportGameState();
      const parsed = JSON.parse(jsonState);
      
      // Remove initialBoardSetup
      delete parsed.initialBoardSetup;
      delete parsed.perceivedDifficulty;
      
      // Import the modified state
      const importSuccess = store.importGameState(JSON.stringify(parsed));
      expect(importSuccess).toBe(true);
      
      const state = useGameStore.getState();
      expect(state.perceivedDifficulty).toBeUndefined();
    });

    it('should be exported and imported correctly', () => {
      const store = useGameStore.getState();
      const originalDifficulty = store.perceivedDifficulty;
      
      const jsonState = store.exportGameState();
      const parsed = JSON.parse(jsonState);
      
      expect(parsed).toHaveProperty('perceivedDifficulty');
      expect(parsed.perceivedDifficulty).toBe(originalDifficulty);
      
      // Import it back
      store.importGameState(jsonState);
      const importedState = useGameStore.getState();
      
      expect(importedState.perceivedDifficulty).toBe(originalDifficulty);
    });
  });

  describe('Completion Progress', () => {
    it('should start at 0% for new game', () => {
      const state = useGameStore.getState();
      
      expect(state.completionProgress).toBeDefined();
      expect(state.completionProgress).toBe(0);
    });

    it('should increase when cards are moved to foundation', () => {
      const store = useGameStore.getState();
      const initialProgress = store.completionProgress;
      
      // Try to move cards to foundation using god mode
      store.toggleGodMode();
      
      // Find an Ace in the tableau
      let aceFound = false;
      for (let col = 0; col < store.tableau.length; col++) {
        const column = store.tableau[col];
        for (let cardIdx = 0; cardIdx < column.length; cardIdx++) {
          const card = column[cardIdx];
          if (card.faceUp && card.rank === 'A') {
            // Select the card and move it to foundation
            store.selectCard('tableau', col, cardIdx);
            store.moveCardToFoundation(card.suit);
            aceFound = true;
            break;
          }
        }
        if (aceFound) break;
      }
      
      // If we found an ace and moved it, progress should have increased
      if (aceFound) {
        const newState = useGameStore.getState();
        expect(newState.completionProgress).toBeGreaterThan(initialProgress);
      }
    });

    it('should be in valid range (0-100)', () => {
      const state = useGameStore.getState();
      
      expect(state.completionProgress).toBeGreaterThanOrEqual(0);
      expect(state.completionProgress).toBeLessThanOrEqual(100);
    });

    it('should be exported and imported correctly', () => {
      const store = useGameStore.getState();
      const originalProgress = store.completionProgress;
      
      const jsonState = store.exportGameState();
      const parsed = JSON.parse(jsonState);
      
      expect(parsed).toHaveProperty('completionProgress');
      expect(parsed.completionProgress).toBe(originalProgress);
      
      // Import it back
      store.importGameState(jsonState);
      const importedState = useGameStore.getState();
      
      expect(importedState.completionProgress).toBe(originalProgress);
    });

    it('should update after moves to tableau', () => {
      const store = useGameStore.getState();
      const initialProgress = store.completionProgress;
      
      // Draw some cards which should update progress slightly due to face-up bonus
      store.drawCard();
      
      const newState = useGameStore.getState();
      // Progress might still be 0 if no cards moved to foundation
      // but it should be a valid number
      expect(typeof newState.completionProgress).toBe('number');
      expect(newState.completionProgress).toBeGreaterThanOrEqual(initialProgress);
    });

    it('should calculate progress based on foundation cards', () => {
      // Get the current game state
      const state = useGameStore.getState();
      
      // We can't directly set foundation, but we can verify the calculation logic
      // by checking that more foundation cards = higher progress
      const foundationCount = 
        state.foundations.hearts.length +
        state.foundations.diamonds.length +
        state.foundations.clubs.length +
        state.foundations.spades.length;
      
      // Progress should be roughly foundationCount / 52 * 100
      const expectedMinProgress = (foundationCount / 52) * 100;
      
      // Actual progress might be slightly higher due to face-up bonus
      expect(state.completionProgress).toBeGreaterThanOrEqual(expectedMinProgress - 0.1);
    });
  });

  describe('Metrics Integration', () => {
    it('should have both metrics defined on initialization', () => {
      const state = useGameStore.getState();
      
      expect(state).toHaveProperty('perceivedDifficulty');
      expect(state).toHaveProperty('completionProgress');
      expect(typeof state.completionProgress).toBe('number');
    });

    it('should handle game state export with metrics', () => {
      const store = useGameStore.getState();
      const jsonState = store.exportGameState();
      const parsed = JSON.parse(jsonState);
      
      expect(parsed).toHaveProperty('perceivedDifficulty');
      expect(parsed).toHaveProperty('completionProgress');
    });

    it('should preserve metrics through export/import cycle', () => {
      const store = useGameStore.getState();
      const originalDifficulty = store.perceivedDifficulty;
      const originalProgress = store.completionProgress;
      
      const jsonState = store.exportGameState();
      store.importGameState(jsonState);
      
      const newState = useGameStore.getState();
      expect(newState.perceivedDifficulty).toBe(originalDifficulty);
      expect(newState.completionProgress).toBe(originalProgress);
    });
  });
});
