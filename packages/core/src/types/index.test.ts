import { describe, it, expect } from 'vitest';
import type { Card, Suit, Rank, Difficulty, Move, MoveCommand, GameState, Foundations, InitializeOptions } from './index';

describe('Core Types', () => {
  describe('Card', () => {
    it('should create a valid Card object', () => {
      const card: Card = {
        suit: 'hearts',
        rank: 'A',
        faceUp: true,
        id: 'hearts-A'
      };
      
      expect(card.suit).toBe('hearts');
      expect(card.rank).toBe('A');
      expect(card.faceUp).toBe(true);
      expect(card.id).toBe('hearts-A');
    });

    it('should support all four suits', () => {
      const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
      suits.forEach(suit => {
        const card: Card = { suit, rank: 'A', faceUp: true, id: `${suit}-A` };
        expect(card.suit).toBe(suit);
      });
    });

    it('should support all thirteen ranks', () => {
      const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      ranks.forEach(rank => {
        const card: Card = { suit: 'hearts', rank, faceUp: true, id: `hearts-${rank}` };
        expect(card.rank).toBe(rank);
      });
    });

    it('should support face up and face down states', () => {
      const faceUpCard: Card = { suit: 'hearts', rank: 'A', faceUp: true, id: 'hearts-A' };
      const faceDownCard: Card = { suit: 'hearts', rank: 'A', faceUp: false, id: 'hearts-A' };
      
      expect(faceUpCard.faceUp).toBe(true);
      expect(faceDownCard.faceUp).toBe(false);
    });
  });

  describe('Difficulty', () => {
    it('should support all five difficulty levels', () => {
      const difficulties: Difficulty[] = [1, 2, 3, 4, 5];
      difficulties.forEach(difficulty => {
        const level: Difficulty = difficulty;
        expect(level).toBe(difficulty);
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Move', () => {
    it('should create a valid Move object', () => {
      const card: Card = { suit: 'hearts', rank: 'A', faceUp: true, id: 'hearts-A' };
      const move: Move = {
        type: 'tableau_to_foundation',
        timestamp: Date.now(),
        card,
        from: { source: 'tableau', columnIndex: 0, cardIndex: 5 },
        to: { target: 'foundation', suit: 'hearts' }
      };
      
      expect(move.type).toBe('tableau_to_foundation');
      expect(move.card).toEqual(card);
      expect(move.from?.source).toBe('tableau');
      expect(move.to?.target).toBe('foundation');
    });

    it('should support all move types', () => {
      const moveTypes: Move['type'][] = [
        'draw_card',
        'recycle_stock',
        'tableau_to_tableau',
        'tableau_to_foundation',
        'discard_to_tableau',
        'discard_to_foundation',
        'flip_card'
      ];
      
      moveTypes.forEach(type => {
        const card: Card = { suit: 'hearts', rank: 'A', faceUp: true, id: 'hearts-A' };
        const move: Move = { type, timestamp: Date.now(), card };
        expect(move.type).toBe(type);
      });
    });
  });

  describe('MoveCommand', () => {
    it('should create a valid MoveCommand', () => {
      const command: MoveCommand = {
        type: 'tableau_to_tableau',
        from: { column: 0, cardIndex: 3 },
        to: { column: 1 }
      };
      
      expect(command.type).toBe('tableau_to_tableau');
      expect(command.from?.column).toBe(0);
      expect(command.to?.column).toBe(1);
    });

    it('should support commands without from/to when not needed', () => {
      const drawCommand: MoveCommand = { type: 'draw_card' };
      expect(drawCommand.type).toBe('draw_card');
      expect(drawCommand.from).toBeUndefined();
      expect(drawCommand.to).toBeUndefined();
    });
  });

  describe('GameState', () => {
    it('should create a valid GameState object', () => {
      const emptyFoundations: Foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: []
      };

      const gameState: GameState = {
        drawPile: [],
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [[], [], [], [], [], [], []],
        moveHistory: [],
        difficulty: 3,
        gameWon: false,
        completionProgress: 0
      };
      
      expect(gameState.drawPile).toHaveLength(0);
      expect(gameState.tableau).toHaveLength(7);
      expect(gameState.difficulty).toBe(3);
      expect(gameState.gameWon).toBe(false);
    });

    it('should support all foundation suits', () => {
      const foundations: Foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: []
      };
      
      expect(foundations).toHaveProperty('hearts');
      expect(foundations).toHaveProperty('diamonds');
      expect(foundations).toHaveProperty('clubs');
      expect(foundations).toHaveProperty('spades');
    });

    it('should support optional fields', () => {
      const emptyFoundations: Foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: []
      };

      const gameState: GameState = {
        drawPile: [],
        discardPile: [],
        foundations: emptyFoundations,
        tableau: [[], [], [], [], [], [], []],
        moveHistory: [],
        difficulty: 3,
        gameWon: false,
        completionProgress: 0,
        perceivedDifficulty: 42,
        initialBoardSetup: {
          drawPile: [],
          discardPile: [],
          foundations: emptyFoundations,
          tableau: [[], [], [], [], [], [], []]
        }
      };
      
      expect(gameState.perceivedDifficulty).toBe(42);
      expect(gameState.initialBoardSetup).toBeDefined();
    });
  });

  describe('InitializeOptions', () => {
    it('should create valid initialization options', () => {
      const options: InitializeOptions = {
        difficulty: 3,
        seed: 12345
      };
      
      expect(options.difficulty).toBe(3);
      expect(options.seed).toBe(12345);
    });

    it('should support all optional fields', () => {
      const card: Card = { suit: 'hearts', rank: 'A', faceUp: true, id: 'hearts-A' };
      const options: InitializeOptions = {
        difficulty: 5,
        customDeck: [card],
        seed: 67890
      };
      
      expect(options.difficulty).toBe(5);
      expect(options.customDeck).toHaveLength(1);
      expect(options.seed).toBe(67890);
    });

    it('should work with no options provided', () => {
      const options: InitializeOptions = {};
      expect(options).toBeDefined();
    });
  });
});
