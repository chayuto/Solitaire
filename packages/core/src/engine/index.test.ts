/**
 * Tests for GameEngine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './index';
import { createCard, createDeck } from '../utils';
import type { Card } from '../types';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('initialize', () => {
    it('creates a valid initial game state', () => {
      const state = engine.initialize({ seed: 12345 });

      expect(state.tableau).toHaveLength(7);
      expect(state.drawPile.length).toBeGreaterThan(0);
      expect(state.discardPile).toHaveLength(0);
      expect(state.difficulty).toBe(3);
      expect(state.gameWon).toBe(false);
      expect(state.completionProgress).toBe(0);
    });

    it('deals correct number of cards to tableau', () => {
      const state = engine.initialize({ seed: 12345 });

      // Column 0: 1 card, Column 1: 2 cards, ..., Column 6: 7 cards
      for (let i = 0; i < 7; i++) {
        expect(state.tableau[i]).toHaveLength(i + 1);
      }
    });

    it('flips only top card of each tableau column', () => {
      const state = engine.initialize({ seed: 12345 });

      for (let col = 0; col < 7; col++) {
        const column = state.tableau[col];
        for (let row = 0; row < column.length; row++) {
          if (row === column.length - 1) {
            expect(column[row].faceUp).toBe(true);
          } else {
            expect(column[row].faceUp).toBe(false);
          }
        }
      }
    });

    it('uses custom difficulty', () => {
      const state = engine.initialize({ difficulty: 1 });

      expect(state.difficulty).toBe(1);
    });

    it('uses custom deck', () => {
      const customDeck = createDeck();
      const state = engine.initialize({ customDeck });

      // Should use the custom deck
      expect(state.tableau[0][0].suit).toBe(customDeck[0].suit);
      expect(state.tableau[0][0].rank).toBe(customDeck[0].rank);
    });

    it('saves initial board setup when not using custom deck', () => {
      const state = engine.initialize({ seed: 12345 });

      expect(state.initialBoardSetup).toBeDefined();
      expect(state.initialBoardSetup?.tableau).toHaveLength(7);
    });

    it('does not save initial board setup when using custom deck', () => {
      const customDeck = createDeck();
      const state = engine.initialize({ customDeck });

      expect(state.initialBoardSetup).toBeUndefined();
    });
  });

  describe('getLegalMoves', () => {
    it('includes draw move when draw pile has cards', () => {
      const state = engine.initialize({ seed: 12345 });

      const moves = engine.getLegalMoves(state);
      const drawMove = moves.find(m => m.type === 'draw_card');

      expect(drawMove).toBeDefined();
    });

    it('includes recycle move when draw pile is empty', () => {
      const state = engine.initialize({ seed: 12345 });
      
      // Draw all cards
      let currentState = state;
      while (currentState.drawPile.length > 0) {
        currentState = engine.applyMove(currentState, { type: 'draw_card' });
      }

      const moves = engine.getLegalMoves(currentState);
      const recycleMove = moves.find(m => m.type === 'recycle_stock');

      expect(recycleMove).toBeDefined();
    });

    it('includes discard to foundation move when valid', () => {
      // Create state with Ace on discard pile
      const state = engine.initialize({ seed: 12345 });
      const ace = createCard('hearts', 'A', true);
      const stateWithAce = {
        ...state,
        discardPile: [ace],
      };

      const moves = engine.getLegalMoves(stateWithAce);
      const foundationMove = moves.find(m => m.type === 'discard_to_foundation');

      expect(foundationMove).toBeDefined();
      expect(foundationMove?.to?.suit).toBe('hearts');
    });

    it('includes tableau to foundation move when valid', () => {
      const state = engine.initialize({ seed: 12345 });
      
      // Place an Ace on top of a tableau column
      const ace = createCard('hearts', 'A', true);
      const stateWithAce = {
        ...state,
        tableau: [
          [...state.tableau[0], ace],
          ...state.tableau.slice(1),
        ],
      };

      const moves = engine.getLegalMoves(stateWithAce);
      const foundationMove = moves.find(
        m => m.type === 'tableau_to_foundation' && m.from?.column === 0
      );

      expect(foundationMove).toBeDefined();
    });
  });

  describe('applyMove - draw and recycle', () => {
    it('draws card from draw pile', () => {
      const state = engine.initialize({ seed: 12345 });
      const initialDrawCount = state.drawPile.length;

      const newState = engine.applyMove(state, { type: 'draw_card' });

      expect(newState.drawPile.length).toBe(initialDrawCount - 1);
      expect(newState.discardPile.length).toBe(1);
      expect(newState.discardPile[0].faceUp).toBe(true);
    });

    it('recycles discard pile to draw pile', () => {
      const state = engine.initialize({ seed: 12345 });
      
      // Draw all cards
      let currentState = state;
      while (currentState.drawPile.length > 0) {
        currentState = engine.applyMove(currentState, { type: 'draw_card' });
      }
      const discardCount = currentState.discardPile.length;

      const newState = engine.applyMove(currentState, { type: 'recycle_stock' });

      expect(newState.drawPile.length).toBe(discardCount);
      expect(newState.discardPile.length).toBe(0);
      expect(newState.drawPile.every(c => !c.faceUp)).toBe(true);
    });
  });

  describe('applyMove - tableau moves', () => {
    it('moves card from tableau to tableau', () => {
      const state = engine.initialize({ seed: 12345 });
      
      // Find a valid tableau to tableau move
      const moves = engine.getLegalMoves(state);
      const tableauMove = moves.find(m => m.type === 'tableau_to_tableau');
      
      if (tableauMove) {
        const srcCol = tableauMove.from!.column!;
        const destCol = tableauMove.to!.column!;
        const srcLength = state.tableau[srcCol].length;
        const destLength = state.tableau[destCol].length;

        const newState = engine.applyMove(state, tableauMove);

        expect(newState.tableau[srcCol].length).toBeLessThan(srcLength);
        expect(newState.tableau[destCol].length).toBeGreaterThan(destLength);
      }
    });

    it('flips newly exposed tableau card', () => {
      const card1 = createCard('clubs', '8', false);
      const card2 = createCard('hearts', '7', true);
      const state = engine.initialize({ seed: 12345 });
      
      // Create a state with a face-down card that will be exposed
      const testState = {
        ...state,
        tableau: [
          [card1, card2],
          [],
          ...state.tableau.slice(2),
        ],
      };

      // Move the top card to another column
      const newState = engine.applyMove(testState, {
        type: 'tableau_to_tableau',
        from: { column: 0, cardIndex: 1 },
        to: { column: 1 },
      });

      expect(newState.tableau[0][0].faceUp).toBe(true);
    });
  });

  describe('applyMove - foundation moves', () => {
    it('moves card from tableau to foundation', () => {
      const state = engine.initialize({ seed: 12345 });
      const ace = createCard('hearts', 'A', true);
      
      const testState = {
        ...state,
        tableau: [
          [...state.tableau[0], ace],
          ...state.tableau.slice(1),
        ],
      };

      const newState = engine.applyMove(testState, {
        type: 'tableau_to_foundation',
        from: { column: 0 },
        to: { suit: 'hearts' },
      });

      expect(newState.foundations.hearts.length).toBe(1);
      expect(newState.foundations.hearts[0].rank).toBe('A');
    });

    it('moves card from discard to foundation', () => {
      const state = engine.initialize({ seed: 12345 });
      const ace = createCard('diamonds', 'A', true);
      
      const testState = {
        ...state,
        discardPile: [ace],
      };

      const newState = engine.applyMove(testState, {
        type: 'discard_to_foundation',
        to: { suit: 'diamonds' },
      });

      expect(newState.foundations.diamonds.length).toBe(1);
      expect(newState.discardPile.length).toBe(0);
    });
  });

  describe('applyMove - discard moves', () => {
    it('moves card from discard to tableau', () => {
      const state = engine.initialize({ seed: 12345 });
      const redSeven = createCard('hearts', '7', true);
      const blackEight = createCard('clubs', '8', true);
      
      const testState = {
        ...state,
        discardPile: [redSeven],
        tableau: [
          [blackEight],
          ...state.tableau.slice(1),
        ],
      };

      const newState = engine.applyMove(testState, {
        type: 'discard_to_tableau',
        to: { column: 0 },
      });

      expect(newState.tableau[0].length).toBe(2);
      expect(newState.tableau[0][1].rank).toBe('7');
      expect(newState.discardPile.length).toBe(0);
    });
  });

  describe('isWon', () => {
    it('returns false for initial game state', () => {
      const state = engine.initialize({ seed: 12345 });
      expect(engine.isWon(state)).toBe(false);
    });

    it('returns true when all foundations are complete', () => {
      const state = engine.initialize({ seed: 12345 });
      
      // Create complete foundations
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

      const wonState = {
        ...state,
        foundations: { hearts, diamonds, clubs, spades },
      };
      
      expect(engine.isWon(wonState)).toBe(true);
    });

    it('returns true when gameWon flag is set', () => {
      const state = engine.initialize({ seed: 12345 });
      const wonState = { ...state, gameWon: true };
      
      expect(engine.isWon(wonState)).toBe(true);
    });

    it('returns false for partially complete foundations', () => {
      const state = engine.initialize({ seed: 12345 });
      
      const hearts = Array.from({ length: 13 }, (_, i) => 
        createCard('hearts', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][i] as any)
      );

      const partialState = {
        ...state,
        foundations: {
          hearts,
          diamonds: [],
          clubs: [],
          spades: [],
        },
      };
      
      expect(engine.isWon(partialState)).toBe(false);
    });
  });

  describe('isLost', () => {
    it('returns false for initial game state (has legal moves)', () => {
      const state = engine.initialize({ seed: 12345 });
      expect(engine.isLost(state)).toBe(false);
    });

    it('returns false for a won game', () => {
      const state = engine.initialize({ seed: 12345 });
      const wonState = { ...state, gameWon: true };
      
      expect(engine.isLost(wonState)).toBe(false);
    });

    it('returns true when no legal moves exist and game not won', () => {
      // Create a state with no legal moves
      const state = engine.initialize({ seed: 12345 });
      const lostState = {
        ...state,
        drawPile: [],
        discardPile: [],
        tableau: [[], [], [], [], [], [], []],
        foundations: {
          hearts: [],
          diamonds: [],
          clubs: [],
          spades: [],
        },
      };
      
      expect(engine.isLost(lostState)).toBe(true);
    });
  });

  describe('getCompletionProgress', () => {
    it('returns 0 for initial game state', () => {
      const state = engine.initialize({ seed: 12345 });
      expect(engine.getCompletionProgress(state)).toBe(0);
    });

    it('returns 100 for completed game', () => {
      const state = engine.initialize({ seed: 12345 });
      
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

      const wonState = {
        ...state,
        foundations: { hearts, diamonds, clubs, spades },
      };
      
      expect(engine.getCompletionProgress(wonState)).toBe(100);
    });

    it('returns 25 for one complete foundation', () => {
      const state = engine.initialize({ seed: 12345 });
      
      const hearts = Array.from({ length: 13 }, (_, i) => 
        createCard('hearts', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][i] as any)
      );

      const partialState = {
        ...state,
        foundations: {
          hearts,
          diamonds: [],
          clubs: [],
          spades: [],
        },
      };
      
      expect(engine.getCompletionProgress(partialState)).toBe(25);
    });
  });

  describe('getPerceivedDifficulty', () => {
    it('returns a number between 0 and 100', () => {
      const state = engine.initialize({ seed: 12345 });
      const difficulty = engine.getPerceivedDifficulty(state);
      
      expect(difficulty).toBeGreaterThanOrEqual(0);
      expect(difficulty).toBeLessThanOrEqual(100);
    });

    it('returns 0 for a won game', () => {
      const state = engine.initialize({ seed: 12345 });
      
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

      const wonState = {
        ...state,
        foundations: { hearts, diamonds, clubs, spades },
      };
      
      expect(engine.getPerceivedDifficulty(wonState)).toBe(0);
    });
  });

  describe('exportState', () => {
    it('exports game state as JSON string', () => {
      const state = engine.initialize({ seed: 12345 });
      const exported = engine.exportState(state);
      
      expect(typeof exported).toBe('string');
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('exported state can be parsed back', () => {
      const state = engine.initialize({ seed: 12345 });
      const exported = engine.exportState(state);
      const parsed = JSON.parse(exported);
      
      expect(parsed.difficulty).toBe(state.difficulty);
      expect(parsed.gameWon).toBe(state.gameWon);
      expect(parsed.drawPile.length).toBe(state.drawPile.length);
    });
  });

  describe('importState', () => {
    it('imports valid game state from JSON', () => {
      const state = engine.initialize({ seed: 12345 });
      const exported = engine.exportState(state);
      const imported = engine.importState(exported);
      
      expect(imported.difficulty).toBe(state.difficulty);
      expect(imported.gameWon).toBe(state.gameWon);
      expect(imported.drawPile.length).toBe(state.drawPile.length);
    });

    it('throws error for invalid JSON', () => {
      expect(() => engine.importState('not valid json')).toThrow('Invalid JSON');
    });

    it('throws error for invalid game state', () => {
      const invalidState = JSON.stringify({ invalid: 'state' });
      expect(() => engine.importState(invalidState)).toThrow();
    });

    it('validates imported state has exactly 52 cards', () => {
      const state = engine.initialize({ seed: 12345 });
      const invalidState = {
        ...state,
        drawPile: [], // Remove cards to make invalid
        tableau: [[], [], [], [], [], [], []],
      };
      
      const exported = JSON.stringify(invalidState);
      expect(() => engine.importState(exported)).toThrow('Game state must have exactly 52 cards');
    });
  });

  describe('canApplyMove', () => {
    it('returns true for valid draw_card move', () => {
      const state = engine.initialize({ seed: 12345 });
      expect(engine.canApplyMove(state, { type: 'draw_card' })).toBe(true);
    });

    it('returns false for draw_card when draw pile is empty', () => {
      const state = engine.initialize({ seed: 12345 });
      const emptyDrawState = { ...state, drawPile: [] };
      expect(engine.canApplyMove(emptyDrawState, { type: 'draw_card' })).toBe(false);
    });

    it('returns true for valid recycle_stock move', () => {
      const state = engine.initialize({ seed: 12345 });
      const recycleState = {
        ...state,
        drawPile: [],
        discardPile: [createCard('hearts', 'A', true)],
      };
      expect(engine.canApplyMove(recycleState, { type: 'recycle_stock' })).toBe(true);
    });

    it('returns false for invalid tableau_to_tableau move', () => {
      const state = engine.initialize({ seed: 12345 });
      expect(engine.canApplyMove(state, {
        type: 'tableau_to_tableau',
        from: { column: 0, cardIndex: 99 }, // Invalid index
        to: { column: 1 },
      })).toBe(false);
    });

    it('returns false for move with missing parameters', () => {
      const state = engine.initialize({ seed: 12345 });
      expect(engine.canApplyMove(state, {
        type: 'tableau_to_tableau',
        from: { column: 0 }, // Missing cardIndex
        to: { column: 1 },
      })).toBe(false);
    });

    it('returns false for trying to move face-down card', () => {
      const state = engine.initialize({ seed: 12345 });
      
      // Try to move a face-down card from column 6 (has multiple face-down cards)
      if (state.tableau[6].length > 1) {
        expect(engine.canApplyMove(state, {
          type: 'tableau_to_tableau',
          from: { column: 6, cardIndex: 0 }, // First card is face-down
          to: { column: 0 },
        })).toBe(false);
      }
    });
  });
});
