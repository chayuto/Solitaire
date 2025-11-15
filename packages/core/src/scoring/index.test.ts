/**
 * Tests for scoring functions
 */

import { describe, it, expect } from 'vitest';
import { getCompletionProgress, getPerceivedDifficulty } from './index';
import { createCard } from '../utils/card';
import type { GameState } from '../types';

/**
 * Helper to create a minimal game state for testing
 */
function createTestState(overrides?: Partial<GameState>): GameState {
  return {
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
    difficulty: 3,
    gameWon: false,
    completionProgress: 0,
    ...overrides,
  };
}

describe('getCompletionProgress', () => {
  it('should return 0 for an empty game', () => {
    const state = createTestState();
    expect(getCompletionProgress(state)).toBe(0);
  });

  it('should return 100 for a completed game', () => {
    // Create 13 cards for each suit
    const hearts = Array.from({ length: 13 }, (_, i) => 
      createCard('hearts', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][i] as any)
    );
    const diamonds = Array.from({ length: 13 }, (_, i) => 
      createCard('diamonds', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][i] as any)
    );
    const clubs = Array.from({ length: 13 }, (_, i) => 
      createCard('clubs', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][i] as any)
    );
    const spades = Array.from({ length: 13 }, (_, i) => 
      createCard('spades', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][i] as any)
    );

    const state = createTestState({
      foundations: { hearts, diamonds, clubs, spades },
    });
    
    expect(getCompletionProgress(state)).toBe(100);
  });

  it('should return 50 for half-completed game', () => {
    // 26 cards in foundations (half of 52)
    const hearts = Array.from({ length: 13 }, (_, i) => 
      createCard('hearts', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][i] as any)
    );
    const diamonds = Array.from({ length: 13 }, (_, i) => 
      createCard('diamonds', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][i] as any)
    );

    const state = createTestState({
      foundations: {
        hearts,
        diamonds,
        clubs: [],
        spades: [],
      },
    });
    
    expect(getCompletionProgress(state)).toBe(50);
  });

  it('should return 25 for quarter-completed game', () => {
    // 13 cards in foundations (1/4 of 52)
    const hearts = Array.from({ length: 13 }, (_, i) => 
      createCard('hearts', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][i] as any)
    );

    const state = createTestState({
      foundations: {
        hearts,
        diamonds: [],
        clubs: [],
        spades: [],
      },
    });
    
    expect(getCompletionProgress(state)).toBe(25);
  });

  it('should calculate progress for partial foundations', () => {
    const state = createTestState({
      foundations: {
        hearts: [createCard('hearts', 'A'), createCard('hearts', '2')],
        diamonds: [createCard('diamonds', 'A')],
        clubs: [],
        spades: [],
      },
    });
    
    // 3 cards out of 52 = 5.769...%
    expect(getCompletionProgress(state)).toBeCloseTo(5.769, 1);
  });
});

describe('getPerceivedDifficulty', () => {
  it('should return 0 for an empty game with no cards', () => {
    const state = createTestState();
    expect(getPerceivedDifficulty(state)).toBe(0);
  });

  it('should increase difficulty for hidden cards', () => {
    // Both states have all columns filled to avoid negative empty column penalty
    const stateNoHidden = createTestState({
      tableau: [
        [createCard('hearts', 'A', true)],
        [createCard('diamonds', 'A', true)],
        [createCard('clubs', 'A', true)],
        [createCard('spades', 'A', true)],
        [createCard('hearts', '2', true)],
        [createCard('diamonds', '2', true)],
        [createCard('clubs', '2', true)],
      ],
    });

    const stateWithHidden = createTestState({
      tableau: [
        [createCard('hearts', 'A', false), createCard('hearts', '2', true)],
        [createCard('diamonds', 'A', false), createCard('diamonds', '2', true)],
        [createCard('clubs', 'A', true)],
        [createCard('spades', 'A', true)],
        [createCard('hearts', '3', true)],
        [createCard('diamonds', '3', true)],
        [createCard('clubs', '3', true)],
      ],
    });

    const diffNoHidden = getPerceivedDifficulty(stateNoHidden);
    const diffWithHidden = getPerceivedDifficulty(stateWithHidden);
    
    // With 2 hidden cards (2 * 2 = 4 points) should be more difficult
    expect(diffWithHidden).toBeGreaterThan(diffNoHidden);
  });

  it('should increase difficulty for buried Kings', () => {
    // Fill all columns to avoid empty column penalties
    const stateNoBuriedKings = createTestState({
      tableau: [
        [createCard('hearts', 'K', true)],
        [createCard('diamonds', 'A', true)],
        [createCard('clubs', 'A', true)],
        [createCard('spades', 'A', true)],
        [createCard('hearts', '2', true)],
        [createCard('diamonds', '2', true)],
        [createCard('clubs', '2', true)],
      ],
    });

    const stateWithBuriedKings = createTestState({
      tableau: [
        [createCard('hearts', 'K', false), createCard('hearts', 'Q', true)],
        [createCard('diamonds', 'A', true)],
        [createCard('clubs', 'A', true)],
        [createCard('spades', 'A', true)],
        [createCard('hearts', '2', true)],
        [createCard('diamonds', '2', true)],
        [createCard('clubs', '2', true)],
      ],
    });

    const diffNoBuried = getPerceivedDifficulty(stateNoBuriedKings);
    const diffWithBuried = getPerceivedDifficulty(stateWithBuriedKings);
    
    // Buried King (5 points) + hidden card (2 points) = 7 points more difficulty
    expect(diffWithBuried).toBeGreaterThan(diffNoBuried);
  });

  it('should decrease difficulty for empty columns', () => {
    // Add some hidden cards to both to keep scores positive
    const stateNoEmpty = createTestState({
      tableau: [
        [createCard('hearts', 'A', false), createCard('hearts', '2', true)],
        [createCard('diamonds', 'A', false), createCard('diamonds', '2', true)],
        [createCard('clubs', 'A', false), createCard('clubs', '2', true)],
        [createCard('spades', 'A', false), createCard('spades', '2', true)],
        [createCard('hearts', '3', false), createCard('hearts', '4', true)],
        [createCard('diamonds', '3', false), createCard('diamonds', '4', true)],
        [createCard('clubs', '3', false), createCard('clubs', '4', true)],
      ],
    });

    const stateWithEmpty = createTestState({
      tableau: [
        [createCard('hearts', 'A', false), createCard('hearts', '2', true)],
        [],
        [],
        [],
        [],
        [],
        [],
      ],
    });

    const diffNoEmpty = getPerceivedDifficulty(stateNoEmpty);
    const diffWithEmpty = getPerceivedDifficulty(stateWithEmpty);
    
    // 6 empty columns = -18 points makes it easier
    expect(diffWithEmpty).toBeLessThan(diffNoEmpty);
  });

  it('should increase difficulty for cards in discard pile', () => {
    // Add cards to tableau to keep base score positive
    const baseTableau = [
      [createCard('hearts', 'A', false), createCard('hearts', '2', true)],
      [createCard('diamonds', 'A', true)],
      [createCard('clubs', 'A', true)],
      [createCard('spades', 'A', true)],
      [createCard('hearts', '3', true)],
      [createCard('diamonds', '3', true)],
      [createCard('clubs', '3', true)],
    ];
    
    const stateNoDiscard = createTestState({
      tableau: baseTableau,
    });

    const stateWithDiscard = createTestState({
      tableau: baseTableau,
      discardPile: [
        createCard('hearts', '4', true),
        createCard('hearts', '5', true),
        createCard('hearts', '6', true),
      ],
    });

    const diffNoDiscard = getPerceivedDifficulty(stateNoDiscard);
    const diffWithDiscard = getPerceivedDifficulty(stateWithDiscard);
    
    // 3 cards in discard * 0.5 = 1.5 points
    expect(diffWithDiscard).toBeGreaterThan(diffNoDiscard);
  });

  it('should decrease difficulty for cards in foundations', () => {
    // Use same tableau setup, only difference is foundations
    const baseTableau = [
      [createCard('hearts', 'K', false), createCard('hearts', 'Q', true)],
      [createCard('diamonds', 'A', true)],
      [createCard('clubs', 'A', true)],
      [createCard('spades', 'A', true)],
      [createCard('hearts', '3', true)],
      [createCard('diamonds', '3', true)],
      [createCard('clubs', '3', true)],
    ];
    
    const stateNoFoundation = createTestState({
      tableau: baseTableau,
    });

    const stateWithFoundation = createTestState({
      tableau: baseTableau,
      foundations: {
        hearts: [createCard('hearts', 'A'), createCard('hearts', '2'), createCard('hearts', '3')],
        diamonds: [],
        clubs: [],
        spades: [],
      },
    });

    const diffNoFoundation = getPerceivedDifficulty(stateNoFoundation);
    const diffWithFoundation = getPerceivedDifficulty(stateWithFoundation);
    
    // 3 foundation cards = -3 points makes it easier
    expect(diffWithFoundation).toBeLessThan(diffNoFoundation);
  });

  it('should return a value between 0 and 100', () => {
    // Create a very difficult state with many hidden cards and buried Kings
    const difficultState = createTestState({
      tableau: [
        Array.from({ length: 7 }, (_, i) => createCard('hearts', 'K', i === 6)),
        Array.from({ length: 6 }, (_, i) => createCard('diamonds', 'K', i === 5)),
        Array.from({ length: 5 }, (_, i) => createCard('clubs', 'K', i === 4)),
        Array.from({ length: 4 }, (_, i) => createCard('spades', 'K', i === 3)),
        Array.from({ length: 3 }, (_, i) => createCard('hearts', 'Q', i === 2)),
        Array.from({ length: 2 }, (_, i) => createCard('diamonds', 'Q', i === 1)),
        [createCard('clubs', 'Q', true)],
      ],
      discardPile: Array.from({ length: 10 }, () => createCard('hearts', 'A', true)),
    });

    const difficulty = getPerceivedDifficulty(difficultState);
    expect(difficulty).toBeGreaterThanOrEqual(0);
    expect(difficulty).toBeLessThanOrEqual(100);
  });

  it('should handle a completed game', () => {
    const wonState = createTestState({
      foundations: {
        hearts: Array.from({ length: 13 }, (_, i) => 
          createCard('hearts', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][i] as any)
        ),
        diamonds: Array.from({ length: 13 }, (_, i) => 
          createCard('diamonds', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][i] as any)
        ),
        clubs: Array.from({ length: 13 }, (_, i) => 
          createCard('clubs', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][i] as any)
        ),
        spades: Array.from({ length: 13 }, (_, i) => 
          createCard('spades', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][i] as any)
        ),
      },
    });

    // Won game should have very low perceived difficulty (clamped to 0)
    // -52 from foundations + (-7 * 3 = -21) from empty columns = -73, clamped to 0
    const difficulty = getPerceivedDifficulty(wonState);
    expect(difficulty).toBe(0); // Clamped to 0
  });
});
