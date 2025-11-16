import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import type { GameState, Rank, Suit } from '../types';

describe('GameStore - Win Condition Detection', () => {
  beforeEach(() => {
    // Reset the store before each test
    useGameStore.getState().initializeGame();
  });

  it('should initialize with gameWon as false', () => {
    const state = useGameStore.getState();
    expect(state.gameWon).toBe(false);
  });

  it('should detect win when all 52 cards are in foundations', () => {
    const store = useGameStore.getState();
    
    // Create a winning state by manually setting all cards in foundations
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    const winningState: Partial<GameState> = {
      drawPile: [],
      discardPile: [],
      tableau: [[], [], [], [], [], [], []],
      foundations: {
        hearts: ranks.map(rank => ({ suit: 'hearts', rank, faceUp: true, id: `hearts-${rank}` })),
        diamonds: ranks.map(rank => ({ suit: 'diamonds', rank, faceUp: true, id: `diamonds-${rank}` })),
        clubs: ranks.map(rank => ({ suit: 'clubs', rank, faceUp: true, id: `clubs-${rank}` })),
        spades: ranks.map(rank => ({ suit: 'spades', rank, faceUp: true, id: `spades-${rank}` })),
      },
    };
    
    // Import the winning state
    const importString = JSON.stringify({
      ...JSON.parse(store.exportGameState()),
      ...winningState,
    });
    
    store.importGameState(importString);
    
    // Manually check win condition by simulating a move to foundation
    // First, let's set up a state where moving one card triggers the win
    const almostWinState: Partial<GameState> = {
      drawPile: [],
      discardPile: [{ suit: 'spades', rank: 'K', faceUp: true, id: 'spades-K' }],
      tableau: [[], [], [], [], [], [], []],
      foundations: {
        hearts: ranks.map(rank => ({ suit: 'hearts', rank, faceUp: true, id: `hearts-${rank}` })),
        diamonds: ranks.map(rank => ({ suit: 'diamonds', rank, faceUp: true, id: `diamonds-${rank}` })),
        clubs: ranks.map(rank => ({ suit: 'clubs', rank, faceUp: true, id: `clubs-${rank}` })),
        spades: ranks.slice(0, -1).map(rank => ({ suit: 'spades', rank, faceUp: true, id: `spades-${rank}` })),
      },
    };
    
    const almostWinString = JSON.stringify({
      ...JSON.parse(store.exportGameState()),
      ...almostWinState,
      gameWon: false,
    });
    
    store.importGameState(almostWinString);
    expect(useGameStore.getState().gameWon).toBe(false);
    
    // Now move the last card to foundation
    store.selectCard('discard');
    store.moveCardToFoundation('spades');
    
    // Check that win was detected
    expect(useGameStore.getState().gameWon).toBe(true);
  });

  it('should not trigger win with less than 52 cards in foundations', () => {
    const store = useGameStore.getState();
    const state = useGameStore.getState();
    
    // We start with 0 cards in foundations
    expect(state.gameWon).toBe(false);
    
    // Even with some cards in foundations, should not win
    const partialState = {
      ...state,
      foundations: {
        hearts: [
          { suit: 'hearts' as Suit, rank: 'A' as Rank, faceUp: true, id: 'hearts-A' },
          { suit: 'hearts' as Suit, rank: '2' as Rank, faceUp: true, id: 'hearts-2' },
        ],
        diamonds: [],
        clubs: [],
        spades: [],
      },
    };
    
    const importString = JSON.stringify(partialState);
    store.importGameState(importString);
    
    expect(useGameStore.getState().gameWon).toBe(false);
  });

  it('should stop autoplay when game is won', () => {
    const store = useGameStore.getState();
    
    // Set up auto-play
    store.toggleAutoPlay();
    expect(useGameStore.getState().autoPlayEnabled).toBe(true);
    
    // Create almost winning state
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const almostWinState: Partial<GameState> = {
      drawPile: [],
      discardPile: [{ suit: 'spades', rank: 'K', faceUp: true, id: 'spades-K' }],
      tableau: [[], [], [], [], [], [], []],
      foundations: {
        hearts: ranks.map(rank => ({ suit: 'hearts', rank, faceUp: true, id: `hearts-${rank}` })),
        diamonds: ranks.map(rank => ({ suit: 'diamonds', rank, faceUp: true, id: `diamonds-${rank}` })),
        clubs: ranks.map(rank => ({ suit: 'clubs', rank, faceUp: true, id: `clubs-${rank}` })),
        spades: ranks.slice(0, -1).map(rank => ({ suit: 'spades', rank, faceUp: true, id: `spades-${rank}` })),
      },
      autoPlayEnabled: true,
      gameWon: false,
    };
    
    const importString = JSON.stringify({
      ...JSON.parse(store.exportGameState()),
      ...almostWinState,
    });
    
    store.importGameState(importString);
    
    // Move the last card to win
    store.selectCard('discard');
    store.moveCardToFoundation('spades');
    
    const finalState = useGameStore.getState();
    expect(finalState.gameWon).toBe(true);
    expect(finalState.autoPlayEnabled).toBe(false);
  });
});

describe('GameStore - Auto-Complete Trigger', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame();
  });

  it('should trigger auto-complete when tableau is sorted and draw pile is empty', () => {
    const store = useGameStore.getState();
    
    // Create a state where all tableau cards are face up and draw pile is empty
    const autoCompleteState: Partial<GameState> = {
      drawPile: [],
      discardPile: [],
      tableau: [
        [
          { suit: 'hearts', rank: 'K', faceUp: true, id: 'hearts-K' },
          { suit: 'spades', rank: 'Q', faceUp: true, id: 'spades-Q' },
        ],
        [{ suit: 'diamonds', rank: 'A', faceUp: true, id: 'diamonds-A' }],
        [],
        [],
        [],
        [],
        [],
      ],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      autoPlayEnabled: false,
      gameWon: false,
    };
    
    const importString = JSON.stringify({
      ...JSON.parse(store.exportGameState()),
      ...autoCompleteState,
    });
    
    store.importGameState(importString);
    
    // Trigger the check
    store.checkAndTriggerAutoComplete();
    
    // Should have enabled auto-play
    expect(useGameStore.getState().autoPlayEnabled).toBe(true);
  });

  it('should not trigger auto-complete when draw pile has cards', () => {
    const store = useGameStore.getState();
    
    // Create a state with cards in draw pile
    const state: Partial<GameState> = {
      drawPile: [{ suit: 'hearts', rank: '5', faceUp: false, id: 'hearts-5' }],
      discardPile: [],
      tableau: [
        [{ suit: 'hearts', rank: 'K', faceUp: true, id: 'hearts-K' }],
        [],
        [],
        [],
        [],
        [],
        [],
      ],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      autoPlayEnabled: false,
      gameWon: false,
    };
    
    const importString = JSON.stringify({
      ...JSON.parse(store.exportGameState()),
      ...state,
    });
    
    store.importGameState(importString);
    
    // Trigger the check
    store.checkAndTriggerAutoComplete();
    
    // Should NOT have enabled auto-play
    expect(useGameStore.getState().autoPlayEnabled).toBe(false);
  });

  it('should not trigger auto-complete when tableau has face-down cards', () => {
    const store = useGameStore.getState();
    
    // Create a state with face-down cards
    const state: Partial<GameState> = {
      drawPile: [],
      discardPile: [],
      tableau: [
        [
          { suit: 'hearts', rank: 'K', faceUp: false, id: 'hearts-K' },
          { suit: 'spades', rank: 'Q', faceUp: true, id: 'spades-Q' },
        ],
        [],
        [],
        [],
        [],
        [],
        [],
      ],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      autoPlayEnabled: false,
      gameWon: false,
    };
    
    const importString = JSON.stringify({
      ...JSON.parse(store.exportGameState()),
      ...state,
    });
    
    store.importGameState(importString);
    
    // Trigger the check
    store.checkAndTriggerAutoComplete();
    
    // Should NOT have enabled auto-play
    expect(useGameStore.getState().autoPlayEnabled).toBe(false);
  });

  it('should not show win modal when loading a won game for replay', () => {
    const store = useGameStore.getState();
    
    // Create a winning state
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const winningState: Partial<GameState> = {
      drawPile: [],
      discardPile: [],
      tableau: [[], [], [], [], [], [], []],
      foundations: {
        hearts: ranks.map(rank => ({ suit: 'hearts', rank, faceUp: true, id: `hearts-${rank}` })),
        diamonds: ranks.map(rank => ({ suit: 'diamonds', rank, faceUp: true, id: `diamonds-${rank}` })),
        clubs: ranks.map(rank => ({ suit: 'clubs', rank, faceUp: true, id: `clubs-${rank}` })),
        spades: ranks.map(rank => ({ suit: 'spades', rank, faceUp: true, id: `spades-${rank}` })),
      },
      gameWon: true, // Game was previously won
      moveHistory: [
        { type: 'draw_card', timestamp: Date.now(), card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'test' } },
      ],
    };
    
    // Export the winning state as if user exported a won game
    const exportedWonGame = JSON.stringify({
      ...JSON.parse(store.exportGameState()),
      ...winningState,
    });
    
    // Import the won game
    store.importGameState(exportedWonGame);
    
    // After importing, gameWon should be false to allow replay
    expect(useGameStore.getState().gameWon).toBe(false);
    
    // User should be able to start replay
    expect(useGameStore.getState().moveHistory.length).toBeGreaterThan(0);
    expect(useGameStore.getState().replayMode).toBe(false); // Not in replay mode yet
  });
});
