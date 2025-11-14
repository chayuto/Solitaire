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

  it('should export move history as JSON string', () => {
    const store = useGameStore.getState();
    store.drawCard();
    
    const jsonHistory = store.exportMoveHistory();
    const parsed = JSON.parse(jsonHistory);
    
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toHaveProperty('type');
    expect(parsed[0]).toHaveProperty('timestamp');
    expect(parsed[0]).toHaveProperty('card');
  });

  it('should export board setup as JSON string', () => {
    const store = useGameStore.getState();
    
    const jsonSetup = store.exportBoardSetup();
    const parsed = JSON.parse(jsonSetup);
    
    expect(parsed).toHaveProperty('drawPile');
    expect(parsed).toHaveProperty('discardPile');
    expect(parsed).toHaveProperty('foundations');
    expect(parsed).toHaveProperty('tableau');
    expect(parsed).not.toHaveProperty('moveHistory');
    expect(parsed).not.toHaveProperty('selectedCard');
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

  it('should handle importing games without move history', () => {
    const store = useGameStore.getState();
    
    // Create a board setup without move history
    const boardSetup = store.exportBoardSetup();
    
    // Import it
    const success = store.importGameState(boardSetup);
    expect(success).toBe(true);
    
    // Should have empty move history
    const newState = useGameStore.getState();
    expect(newState.moveHistory).toEqual([]);
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

  it('should handle importing games without toggle states (backward compatibility)', () => {
    const store = useGameStore.getState();
    
    // Create a state without toggle fields (simulating old saved game)
    const exported = store.exportGameState();
    const parsed = JSON.parse(exported);
    delete parsed.showValidMoves;
    delete parsed.godMode;
    const oldFormat = JSON.stringify(parsed);
    
    // Import it
    const success = store.importGameState(oldFormat);
    expect(success).toBe(true);
    
    // Should use default values
    const newState = useGameStore.getState();
    expect(newState.showValidMoves).toBe(true);
    expect(newState.godMode).toBe(false);
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
