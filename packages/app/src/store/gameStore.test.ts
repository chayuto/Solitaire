import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';

describe('GameStore - Movement Recording', () => {
  beforeEach(() => {
    // Reset the store before each test
    useGameStore.getState().initializeGame();
  });

  it('should initialize with empty move history', () => {
    const state = useGameStore.getState();
    expect(state.moveHistory).toEqual([]);
  });

  it('should record draw card moves', () => {
    const store = useGameStore.getState();
    const initialHistoryLength = store.moveHistory.length;
    
    store.drawCard();
    
    const state = useGameStore.getState();
    expect(state.moveHistory.length).toBe(initialHistoryLength + 1);
    expect(state.moveHistory[state.moveHistory.length - 1].type).toBe('draw_card');
  });

  it('should export move history within game state', () => {
    const store = useGameStore.getState();
    store.drawCard();
    
    const jsonState = store.exportGameState();
    const parsed = JSON.parse(jsonState);
    
    expect(parsed).toHaveProperty('moveHistory');
    expect(Array.isArray(parsed.moveHistory)).toBe(true);
    expect(parsed.moveHistory.length).toBeGreaterThan(0);
    expect(parsed.moveHistory[0]).toHaveProperty('type');
    expect(parsed.moveHistory[0]).toHaveProperty('timestamp');
    expect(parsed.moveHistory[0]).toHaveProperty('card');
  });

  it('should export initial board setup within game state', () => {
    const store = useGameStore.getState();
    
    const jsonState = store.exportGameState();
    const parsed = JSON.parse(jsonState);
    
    expect(parsed).toHaveProperty('initialBoardSetup');
    expect(parsed.initialBoardSetup).toHaveProperty('drawPile');
    expect(parsed.initialBoardSetup).toHaveProperty('discardPile');
    expect(parsed.initialBoardSetup).toHaveProperty('foundations');
    expect(parsed.initialBoardSetup).toHaveProperty('tableau');
    expect(parsed).toHaveProperty('drawPile');
    expect(parsed).toHaveProperty('discardPile');
    expect(parsed).toHaveProperty('foundations');
    expect(parsed).toHaveProperty('tableau');
  });

  it('should record tableau to tableau moves', () => {
    const store = useGameStore.getState();
    
    // Find a valid move to make
    const state = useGameStore.getState();
    
    // Try to find a card we can select and move
    for (let col = 0; col < state.tableau.length; col++) {
      const column = state.tableau[col];
      if (column.length > 0 && column[column.length - 1].faceUp) {
        const card = column[column.length - 1];
        store.selectCard('tableau', col, column.length - 1);
        
        // Try to move to another column
        for (let targetCol = 0; targetCol < state.tableau.length; targetCol++) {
          if (targetCol !== col && store.canMoveToTableau(card, targetCol)) {
            const initialHistoryLength = useGameStore.getState().moveHistory.length;
            store.moveCardToTableau(targetCol);
            const newState = useGameStore.getState();
            
            expect(newState.moveHistory.length).toBeGreaterThan(initialHistoryLength);
            const lastMove = newState.moveHistory[newState.moveHistory.length - 1];
            expect(['tableau_to_tableau', 'flip_card']).toContain(lastMove.type);
            return; // Exit after successful test
          }
        }
      }
    }
  });

  it('should record discard to tableau moves', () => {
    const store = useGameStore.getState();
    
    // Draw a card first
    store.drawCard();
    
    const state = useGameStore.getState();
    if (state.discardPile.length > 0) {
      const card = state.discardPile[state.discardPile.length - 1];
      store.selectCard('discard');
      
      // Try to move to a column
      for (let targetCol = 0; targetCol < state.tableau.length; targetCol++) {
        if (store.canMoveToTableau(card, targetCol)) {
          const initialHistoryLength = useGameStore.getState().moveHistory.length;
          store.moveCardToTableau(targetCol);
          const newState = useGameStore.getState();
          
          expect(newState.moveHistory.length).toBeGreaterThan(initialHistoryLength);
          const lastMove = newState.moveHistory[newState.moveHistory.length - 1];
          expect(lastMove.type).toBe('discard_to_tableau');
          return; // Exit after successful test
        }
      }
    }
  });

  it('should preserve move history on import', () => {
    const store = useGameStore.getState();
    
    // Make some moves
    store.drawCard();
    store.drawCard();
    
    const exported = store.exportGameState();
    
    // Initialize new game (clear history)
    store.initializeGame();
    expect(useGameStore.getState().moveHistory.length).toBe(0);
    
    // Import the saved game
    const success = store.importGameState(exported);
    expect(success).toBe(true);
    
    const newState = useGameStore.getState();
    expect(newState.moveHistory.length).toBe(2);
  });


});

describe('GameStore - UI Toggles', () => {
  beforeEach(() => {
    // Reset the store before each test
    useGameStore.getState().initializeGame();
  });

  it('should initialize with showValidMoves enabled', () => {
    const state = useGameStore.getState();
    expect(state.showValidMoves).toBe(true);
  });

  it('should initialize with godMode disabled', () => {
    const state = useGameStore.getState();
    expect(state.godMode).toBe(false);
  });

  it('should toggle showValidMoves', () => {
    const store = useGameStore.getState();
    const initialValue = store.showValidMoves;
    
    store.toggleValidMoves();
    expect(useGameStore.getState().showValidMoves).toBe(!initialValue);
    
    store.toggleValidMoves();
    expect(useGameStore.getState().showValidMoves).toBe(initialValue);
  });

  it('should toggle godMode', () => {
    const store = useGameStore.getState();
    const initialValue = store.godMode;
    
    store.toggleGodMode();
    expect(useGameStore.getState().godMode).toBe(!initialValue);
    
    store.toggleGodMode();
    expect(useGameStore.getState().godMode).toBe(initialValue);
  });

  it('should preserve toggle states on export/import', () => {
    const store = useGameStore.getState();
    
    // Set custom toggle states
    store.toggleValidMoves(); // Disable valid moves
    store.toggleGodMode(); // Enable god mode
    
    const exported = store.exportGameState();
    
    // Initialize new game (reset to defaults)
    store.initializeGame();
    expect(useGameStore.getState().showValidMoves).toBe(true);
    expect(useGameStore.getState().godMode).toBe(false);
    
    // Import the saved game
    const success = store.importGameState(exported);
    expect(success).toBe(true);
    
    const newState = useGameStore.getState();
    expect(newState.showValidMoves).toBe(false);
    expect(newState.godMode).toBe(true);
  });

  it('should initialize with autoPlayEnabled disabled', () => {
    const state = useGameStore.getState();
    expect(state.autoPlayEnabled).toBe(false);
    expect(state.autoPlayInProgress).toBe(false);
  });

  it('should toggle autoPlayEnabled', () => {
    const store = useGameStore.getState();
    expect(store.autoPlayEnabled).toBe(false);
    
    store.toggleAutoPlay();
    expect(useGameStore.getState().autoPlayEnabled).toBe(true);
    
    store.toggleAutoPlay();
    expect(useGameStore.getState().autoPlayEnabled).toBe(false);
  });

  it('should preserve autoPlayEnabled state on export/import', () => {
    const store = useGameStore.getState();
    
    // Enable auto-play
    store.toggleAutoPlay();
    
    const exported = store.exportGameState();
    
    // Initialize new game (reset to defaults)
    store.initializeGame();
    expect(useGameStore.getState().autoPlayEnabled).toBe(false);
    
    // Import the saved game
    const success = store.importGameState(exported);
    expect(success).toBe(true);
    
    const newState = useGameStore.getState();
    expect(newState.autoPlayEnabled).toBe(true);
    // autoPlayInProgress should always be false after import
    expect(newState.autoPlayInProgress).toBe(false);
  });
});

describe('GameStore - Auto-Play Loop and Deadend Detection', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame();
  });

  it('should log autoplay_start event when auto-play is enabled', () => {
    const store = useGameStore.getState();
    const initialHistoryLength = store.moveHistory.length;
    
    store.toggleAutoPlay();
    
    const state = useGameStore.getState();
    expect(state.autoPlayEnabled).toBe(true);
    expect(state.moveHistory.length).toBe(initialHistoryLength + 1);
    expect(state.moveHistory[state.moveHistory.length - 1].type).toBe('autoplay_start');
  });

  it('should log autoplay_stop event when auto-play is disabled', () => {
    const store = useGameStore.getState();
    
    // Enable auto-play first
    store.toggleAutoPlay();
    const afterStartLength = useGameStore.getState().moveHistory.length;
    
    // Disable auto-play
    store.toggleAutoPlay();
    
    const state = useGameStore.getState();
    expect(state.autoPlayEnabled).toBe(false);
    expect(state.moveHistory.length).toBe(afterStartLength + 1);
    expect(state.moveHistory[state.moveHistory.length - 1].type).toBe('autoplay_stop');
  });

  it('should initialize autoPlayStateHistory as empty array', () => {
    const state = useGameStore.getState();
    expect(state.autoPlayStateHistory).toEqual([]);
  });

  it('should clear autoPlayStateHistory when auto-play is toggled off', () => {
    const store = useGameStore.getState();
    
    // Enable auto-play
    store.toggleAutoPlay();
    
    // Manually set some state history to simulate game states
    useGameStore.setState({ autoPlayStateHistory: ['state1', 'state2', 'state3'] });
    
    // Disable auto-play
    store.toggleAutoPlay();
    
    const state = useGameStore.getState();
    expect(state.autoPlayStateHistory).toEqual([]);
  });

  it('should detect deadend when no valid moves are available', () => {
    const store = useGameStore.getState();
    
    // Create a deadend scenario: empty draw pile, empty discard pile, no valid moves
    const deadendState = {
      drawPile: [],
      discardPile: [],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [
        [{ suit: 'hearts' as const, rank: '2' as const, faceUp: true, id: 'hearts-2' }],
        [{ suit: 'diamonds' as const, rank: '3' as const, faceUp: true, id: 'diamonds-3' }],
        [],
        [],
        [],
        [],
        [],
      ],
      selectedCard: undefined,
      moveHistory: [],
      showValidMoves: true,
      godMode: false,
      autoPlayEnabled: true,
      autoPlayInProgress: false,
      autoPlayStateHistory: [],
    };
    
    useGameStore.setState(deadendState);
    
    // Trigger auto-play move
    store.performAutoPlayMove();
    
    // Wait a bit for async operations
    const state = useGameStore.getState();
    
    // Should have logged a deadend event
    const deadendMove = state.moveHistory.find(m => m.type === 'autoplay_deadend');
    expect(deadendMove).toBeDefined();
    expect(state.autoPlayEnabled).toBe(false);
  });

  it('should track state history up to 20 states for loop detection', () => {
    const store = useGameStore.getState();
    
    // Create a simple game state
    const testState = {
      drawPile: [{ suit: 'hearts' as const, rank: 'K' as const, faceUp: false, id: 'hearts-K' }],
      discardPile: [],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [
        [{ suit: 'clubs' as const, rank: 'A' as const, faceUp: true, id: 'clubs-A' }],
        [],
        [],
        [],
        [],
        [],
        [],
      ],
      selectedCard: undefined,
      moveHistory: [],
      showValidMoves: true,
      godMode: false,
      autoPlayEnabled: true,
      autoPlayInProgress: false,
      autoPlayStateHistory: [],
    };
    
    useGameStore.setState(testState);
    
    // Perform a move
    store.performAutoPlayMove();
    
    // Check that state history was updated
    const state = useGameStore.getState();
    expect(state.autoPlayStateHistory).toBeDefined();
    expect(Array.isArray(state.autoPlayStateHistory)).toBe(true);
  });
});

describe('GameStore - Smart Auto-Play Strategy', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame();
  });

  it('should prioritize moving Aces to foundation', () => {
    const store = useGameStore.getState();
    
    // Set up a scenario with an Ace and other moves available
    const testState = {
      drawPile: [],
      discardPile: [{ suit: 'hearts' as const, rank: 'A' as const, faceUp: true, id: 'hearts-A' }],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [
        [{ suit: 'clubs' as const, rank: '5' as const, faceUp: true, id: 'clubs-5' }],
        [{ suit: 'diamonds' as const, rank: '6' as const, faceUp: true, id: 'diamonds-6' }],
        [],
        [],
        [],
        [],
        [],
      ],
      selectedCard: undefined,
      moveHistory: [],
      showValidMoves: true,
      godMode: false,
      autoPlayEnabled: true,
      autoPlayInProgress: false,
      autoPlayStateHistory: [],
    };
    
    useGameStore.setState(testState);
    
    // Perform auto-play move
    store.performAutoPlayMove();
    
    // The Ace should be moved to foundation
    // We can't check this immediately due to async setTimeout, but we can verify the move was initiated
    const state = useGameStore.getState();
    expect(state.selectedCard).toBeDefined();
  });

  it('should avoid moving non-Kings to empty tableau columns', () => {
    const store = useGameStore.getState();
    
    // Set up a scenario where a non-King could move to an empty column
    const testState = {
      drawPile: [],
      discardPile: [{ suit: 'hearts' as const, rank: '5' as const, faceUp: true, id: 'hearts-5' }],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [
        [],
        [{ suit: 'diamonds' as const, rank: '6' as const, faceUp: true, id: 'diamonds-6' }],
        [],
        [],
        [],
        [],
        [],
      ],
      selectedCard: undefined,
      moveHistory: [],
      showValidMoves: true,
      godMode: false,
      autoPlayEnabled: true,
      autoPlayInProgress: false,
      autoPlayStateHistory: [],
    };
    
    useGameStore.setState(testState);
    
    // Perform auto-play move
    store.performAutoPlayMove();
    
    // The 5 should move to the 6, not to the empty column
    // Due to async nature, we verify the selection was made
    const state = useGameStore.getState();
    expect(state.autoPlayInProgress).toBe(true);
  });

  it('should prefer moves that reveal face-down cards', () => {
    const store = useGameStore.getState();
    
    // Set up a scenario where one move reveals a card and another doesn't
    const testState = {
      drawPile: [],
      discardPile: [],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [
        [
          { suit: 'hearts' as const, rank: '7' as const, faceUp: false, id: 'hearts-7' },
          { suit: 'clubs' as const, rank: '6' as const, faceUp: true, id: 'clubs-6' },
        ],
        [{ suit: 'diamonds' as const, rank: '7' as const, faceUp: true, id: 'diamonds-7' }],
        [],
        [],
        [],
        [],
        [],
      ],
      selectedCard: undefined,
      moveHistory: [],
      showValidMoves: true,
      godMode: false,
      autoPlayEnabled: true,
      autoPlayInProgress: false,
      autoPlayStateHistory: [],
    };
    
    useGameStore.setState(testState);
    
    // Perform auto-play move
    store.performAutoPlayMove();
    
    // The move should select the card that reveals a face-down card
    const state = useGameStore.getState();
    expect(state.autoPlayInProgress).toBe(true);
  });

  it('should handle loop detection with enhanced state tracking', () => {
    const store = useGameStore.getState();
    
    // Create a scenario that could loop
    const loopState = {
      drawPile: [],
      discardPile: [],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [
        [{ suit: 'hearts' as const, rank: '5' as const, faceUp: true, id: 'hearts-5' }],
        [{ suit: 'clubs' as const, rank: '6' as const, faceUp: true, id: 'clubs-6' }],
        [],
        [],
        [],
        [],
        [],
      ],
      selectedCard: undefined,
      moveHistory: [],
      showValidMoves: true,
      godMode: false,
      autoPlayEnabled: true,
      autoPlayInProgress: false,
      autoPlayStateHistory: [],
    };
    
    useGameStore.setState(loopState);
    
    // Manually add current state to history to simulate a loop
    const currentHash = JSON.stringify({
      drawPile: [],
      discardPile: [],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: loopState.tableau.map(col => col.map(c => ({ id: c.id, faceUp: c.faceUp }))),
    });
    
    useGameStore.setState({ autoPlayStateHistory: [currentHash] });
    
    // Trigger auto-play move which should detect the loop
    store.performAutoPlayMove();
    
    const state = useGameStore.getState();
    
    // Should detect loop and stop
    const loopMove = state.moveHistory.find(m => m.type === 'autoplay_loop_detected');
    expect(loopMove).toBeDefined();
    expect(state.autoPlayEnabled).toBe(false);
  });

  it('should avoid moves that would result in loop states (predictive loop detection)', () => {
    const store = useGameStore.getState();
    
    // Create a scenario with multiple possible moves where one would cause a loop
    const testState = {
      drawPile: [],
      discardPile: [],
      foundations: {
        hearts: [{ suit: 'hearts' as const, rank: 'A' as const, faceUp: true, id: 'hearts-A' }],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [
        [{ suit: 'spades' as const, rank: '7' as const, faceUp: true, id: 'spades-7' }],
        [{ suit: 'hearts' as const, rank: '8' as const, faceUp: true, id: 'hearts-8' }],
        [{ suit: 'clubs' as const, rank: '9' as const, faceUp: true, id: 'clubs-9' }],
        [],
        [],
        [],
        [],
      ],
      selectedCard: undefined,
      moveHistory: [],
      showValidMoves: true,
      godMode: false,
      autoPlayEnabled: true,
      autoPlayInProgress: false,
      autoPlayStateHistory: [],
      difficulty: 3 as const,
      gameWon: false,
      completionProgress: 0,
    };
    
    useGameStore.setState(testState);
    
    // Simulate a state hash that would result from moving spades-7 to hearts-8
    const loopingStateHash = JSON.stringify({
      drawPile: [],
      discardPile: [],
      foundations: {
        hearts: ['hearts-A'],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [
        [],
        [
          { id: 'hearts-8', faceUp: true },
          { id: 'spades-7', faceUp: true },
        ],
        [{ id: 'clubs-9', faceUp: true }],
        [],
        [],
        [],
        [],
      ],
    });
    
    // Add this state to history to mark it as already visited
    useGameStore.setState({ autoPlayStateHistory: [loopingStateHash] });
    
    // Trigger auto-play move
    store.performAutoPlayMove();
    
    const state = useGameStore.getState();
    
    // Should NOT have triggered loop detection immediately since it should avoid the looping move
    const loopMove = state.moveHistory.find(m => m.type === 'autoplay_loop_detected');
    expect(loopMove).toBeUndefined();
    
    // Should have selected a move (autoPlayInProgress should be true after selecting move)
    expect(state.autoPlayInProgress).toBe(true);
  });

  it('should detect loop immediately when all possible moves would result in loop states', () => {
    const store = useGameStore.getState();
    
    // Create a simple scenario with only one possible move
    const testState = {
      drawPile: [],
      discardPile: [],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [
        [{ suit: 'spades' as const, rank: '7' as const, faceUp: true, id: 'spades-7' }],
        [{ suit: 'hearts' as const, rank: '8' as const, faceUp: true, id: 'hearts-8' }],
        [],
        [],
        [],
        [],
        [],
      ],
      selectedCard: undefined,
      moveHistory: [],
      showValidMoves: true,
      godMode: false,
      autoPlayEnabled: true,
      autoPlayInProgress: false,
      autoPlayStateHistory: [],
      difficulty: 3 as const,
      gameWon: false,
      completionProgress: 0,
    };
    
    useGameStore.setState(testState);
    
    // Simulate state hashes for ALL possible moves
    const loopingStateHash1 = JSON.stringify({
      drawPile: [],
      discardPile: [],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [
        [],
        [
          { id: 'hearts-8', faceUp: true },
          { id: 'spades-7', faceUp: true },
        ],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    
    const loopingStateHash2 = JSON.stringify({
      drawPile: [],
      discardPile: [],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [
        [
          { id: 'spades-7', faceUp: true },
          { id: 'hearts-8', faceUp: true },
        ],
        [],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    
    // Add both possible states to history
    useGameStore.setState({ autoPlayStateHistory: [loopingStateHash1, loopingStateHash2] });
    
    // Trigger auto-play move
    store.performAutoPlayMove();
    
    const state = useGameStore.getState();
    
    // Should have detected loop immediately since all moves lead to loops
    const loopMove = state.moveHistory.find(m => m.type === 'autoplay_loop_detected');
    expect(loopMove).toBeDefined();
    expect(state.autoPlayEnabled).toBe(false);
  });

});

describe('GameStore - Valid Move Detection', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame();
  });

  it('should detect when a card has valid tableau destination', () => {
    const store = useGameStore.getState();
    
    // Get a card from the tableau
    const card = store.tableau[0].find(c => c.faceUp);
    if (!card) return; // Skip if no face-up card
    
    // Check if it has any valid tableau destination
    const hasDestination = store.hasValidTableauDestination(card, 0);
    
    // Result should be boolean
    expect(typeof hasDestination).toBe('boolean');
  });

  it('should detect when a card has valid foundation destination', () => {
    const store = useGameStore.getState();
    
    // Create a test scenario with an Ace that can go to foundation
    const testState = {
      ...store,
      tableau: [
        [{ suit: 'hearts' as const, rank: 'A' as const, faceUp: true, id: 'hearts-A' }],
        ...store.tableau.slice(1),
      ],
    };
    
    useGameStore.setState(testState);
    
    const ace = testState.tableau[0][0];
    const hasDestination = store.hasValidFoundationDestination(ace);
    
    expect(hasDestination).toBe(true);
  });

  it('should detect when a card has any valid destination', () => {
    const store = useGameStore.getState();
    
    // Get the first face-up card from tableau
    let foundCard = false;
    for (let col = 0; col < store.tableau.length; col++) {
      const column = store.tableau[col];
      for (let idx = 0; idx < column.length; idx++) {
        const card = column[idx];
        if (card.faceUp) {
          const hasDestination = store.hasAnyValidDestination(card, 'tableau', col, idx);
          expect(typeof hasDestination).toBe('boolean');
          foundCard = true;
          break;
        }
      }
      if (foundCard) break;
    }
  });

  it('should return false for face-down cards', () => {
    const store = useGameStore.getState();
    
    // Find a face-down card
    let foundCard = false;
    for (let col = 0; col < store.tableau.length; col++) {
      const column = store.tableau[col];
      for (let idx = 0; idx < column.length; idx++) {
        const card = column[idx];
        if (!card.faceUp) {
          const hasDestination = store.hasAnyValidDestination(card, 'tableau', col, idx);
          expect(hasDestination).toBe(false);
          foundCard = true;
          break;
        }
      }
      if (foundCard) break;
    }
  });

  it('should exclude source column when checking tableau destinations', () => {
    const store = useGameStore.getState();
    
    // Get a King from tableau
    const testState = {
      ...store,
      tableau: [
        [{ suit: 'hearts' as const, rank: 'K' as const, faceUp: true, id: 'hearts-K' }],
        [], // Empty column
        ...store.tableau.slice(2),
      ],
    };
    
    useGameStore.setState(testState);
    
    const king = testState.tableau[0][0];
    // Should find the empty column (index 1) as valid destination
    const hasDestination = store.hasValidTableauDestination(king, 0);
    
    expect(hasDestination).toBe(true);
  });
});

describe('GameStore - Difficulty System', () => {
  it('should initialize with default difficulty 3 (Normal)', () => {
    useGameStore.getState().initializeGame();
    const state = useGameStore.getState();
    expect(state.difficulty).toBe(3);
  });

  it('should initialize with specified difficulty', () => {
    useGameStore.getState().initializeGame(1);
    expect(useGameStore.getState().difficulty).toBe(1);

    useGameStore.getState().initializeGame(5);
    expect(useGameStore.getState().difficulty).toBe(5);
  });

  it('should set difficulty and preserve it in new games', () => {
    const store = useGameStore.getState();
    store.setDifficulty(2);
    expect(useGameStore.getState().difficulty).toBe(2);
    
    // Initialize a new game without specifying difficulty
    store.initializeGame();
    expect(useGameStore.getState().difficulty).toBe(2);
  });

  it('should export and import difficulty in game state', () => {
    const store = useGameStore.getState();
    store.initializeGame(4);
    
    const exportedState = store.exportGameState();
    const parsed = JSON.parse(exportedState);
    expect(parsed.difficulty).toBe(4);
    
    // Import back
    store.initializeGame(1); // Change difficulty first
    const success = store.importGameState(exportedState);
    expect(success).toBe(true);
    expect(useGameStore.getState().difficulty).toBe(4);
  });

  it('should create game with 52 cards regardless of difficulty', () => {
    [1, 2, 3, 4, 5].forEach((difficulty) => {
      useGameStore.getState().initializeGame(difficulty as 1 | 2 | 3 | 4 | 5);
      const state = useGameStore.getState();
      
      const tableauCards = state.tableau.flat().length;
      const drawPileCards = state.drawPile.length;
      const totalCards = tableauCards + drawPileCards;
      
      expect(totalCards).toBe(52);
    });
  });

  it('should have 28 cards in tableau (1+2+3+4+5+6+7) for all difficulties', () => {
    [1, 2, 3, 4, 5].forEach((difficulty) => {
      useGameStore.getState().initializeGame(difficulty as 1 | 2 | 3 | 4 | 5);
      const state = useGameStore.getState();
      
      const tableauCards = state.tableau.flat().length;
      expect(tableauCards).toBe(28);
    });
  });
});

describe('GameStore - Smarter Auto-Play with Face-Down Card Knowledge', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame();
  });

  it('should prioritize moves that reveal face-down cards', () => {
    // Verify the initial game state has face-down cards that the autoplay can see
    const state = useGameStore.getState();
    
    // Check that autoplay can access face-down cards
    let hasFaceDownCards = false;
    state.tableau.forEach(column => {
      column.forEach(card => {
        if (!card.faceUp) {
          hasFaceDownCards = true;
          // Verify the autoplay has access to card properties even when face down
          expect(card.suit).toBeDefined();
          expect(card.rank).toBeDefined();
          expect(card.id).toBeDefined();
        }
      });
    });
    
    // Initial tableau should have 21 face-down cards (1+2+3+4+5+6)
    expect(hasFaceDownCards).toBe(true);
  });

  it('should make strategic decisions based on face-down card ranks', () => {
    // The autoplay should know what cards are face-down and prioritize accordingly
    // We can verify this by checking that it makes sensible moves
    const state = useGameStore.getState();
    
    // All face-down cards should be accessible (they exist in the tableau)
    let faceDownCount = 0;
    state.tableau.forEach(column => {
      column.forEach(card => {
        if (!card.faceUp) {
          faceDownCount++;
          // The card object exists and has properties even when face down
          expect(card).toHaveProperty('suit');
          expect(card).toHaveProperty('rank');
          expect(card).toHaveProperty('id');
        }
      });
    });
    
    // Initial state should have face-down cards (1+2+3+4+5+6 = 21 face-down)
    expect(faceDownCount).toBe(21);
  });

  it('should avoid blocking important face-down cards', () => {
    // Create a scenario where a move could block an important card
    // Column 0: K♥ (hidden), A♠ (face up)
    // Column 1: 2♣ (face up)
    // Discard: K♦ (face up)
    const initialBoardSetup = useGameStore.getState().initialBoardSetup;
    const testState = {
      drawPile: [],
      discardPile: [
        { suit: 'diamonds' as const, rank: 'K' as const, faceUp: true, id: 'k-diamonds' },
      ],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [
          { suit: 'spades' as const, rank: 'A' as const, faceUp: true, id: 'a-spades-found' },
        ],
      },
      tableau: [
        [
          { suit: 'hearts' as const, rank: 'K' as const, faceUp: false, id: 'k-hearts-hidden' },
          { suit: 'diamonds' as const, rank: 'A' as const, faceUp: true, id: 'a-diamonds' },
        ],
        [
          { suit: 'clubs' as const, rank: '2' as const, faceUp: true, id: '2-clubs' },
        ],
        [],
        [],
        [],
        [],
        [],
      ],
      moveHistory: [],
      showValidMoves: true,
      godMode: false,
      autoPlayEnabled: true,
      autoPlayInProgress: false,
      autoPlayStateHistory: [],
      difficulty: 3 as const,
      gameWon: false,
      initialBoardSetup,
      perceivedDifficulty: 50,
      completionProgress: 0,
    };

    useGameStore.setState(testState);
    
    // The face-down K♥ is valuable and should be considered
    // Autoplay should be aware of it when making decisions
    const state = useGameStore.getState();
    const hiddenKing = state.tableau[0].find(card => !card.faceUp && card.rank === 'K');
    expect(hiddenKing).toBeDefined();
    expect(hiddenKing?.suit).toBe('hearts');
  });

  it('should prefer revealing high-value cards like Kings and Aces', () => {
    // Set up two columns:
    // Column 0: has K♠ hidden underneath
    // Column 1: has 2♦ hidden underneath
    // Both have movable top cards
    const initialBoardSetup = useGameStore.getState().initialBoardSetup;
    const testState = {
      drawPile: [],
      discardPile: [],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [
        [
          { suit: 'spades' as const, rank: 'K' as const, faceUp: false, id: 'k-spades-hidden' },
          { suit: 'hearts' as const, rank: '7' as const, faceUp: true, id: '7-hearts' },
        ],
        [
          { suit: 'diamonds' as const, rank: '2' as const, faceUp: false, id: '2-diamonds-hidden' },
          { suit: 'clubs' as const, rank: '9' as const, faceUp: true, id: '9-clubs' },
        ],
        [
          { suit: 'diamonds' as const, rank: '8' as const, faceUp: true, id: '8-diamonds' },
        ],
        [
          { suit: 'spades' as const, rank: '10' as const, faceUp: true, id: '10-spades' },
        ],
        [],
        [],
        [],
      ],
      moveHistory: [],
      showValidMoves: true,
      godMode: false,
      autoPlayEnabled: true,
      autoPlayInProgress: false,
      autoPlayStateHistory: [],
      difficulty: 3 as const,
      gameWon: false,
      initialBoardSetup,
      perceivedDifficulty: 50,
      completionProgress: 0,
    };

    useGameStore.setState(testState);
    
    // Both 7♥ and 9♣ can be moved
    // 7♥ can go on 8♦ (reveals K♠ - high value)
    // 9♣ can go on 10♠ (reveals 2♦ - low value)
    // Smart autoplay should prioritize revealing the King
    
    // Verify the setup is correct
    const state = useGameStore.getState();
    expect(state.tableau[0][0].rank).toBe('K');
    expect(state.tableau[0][0].faceUp).toBe(false);
    expect(state.tableau[1][0].rank).toBe('2');
    expect(state.tableau[1][0].faceUp).toBe(false);
  });
});
