/**
 * Game engine implementation
 * Main game logic for Klondike Solitaire
 */

import type { GameState, InitializeOptions, MoveCommand } from '../types';
import { arrangeDeckByDifficulty } from '../utils/deck';
import { canDraw, draw, canRecycle, recycle } from '../rules/stock';
import { canMoveToTableau, canMoveSequence, getValidTableauDestinations } from '../rules/tableau';
import { canMoveToFoundation, hasValidFoundationDestination } from '../rules/foundation';
import { getCompletionProgress as calcCompletionProgress, getPerceivedDifficulty as calcPerceivedDifficulty } from '../scoring';
import { validateGameState } from '../utils/validation';
import { TABLEAU_COLUMNS, CARDS_PER_SUIT } from '../constants';

/**
 * GameEngine class for Klondike Solitaire
 * Provides pure functions for game state management
 * All methods return new state objects without mutating inputs
 */
export class GameEngine {
  /**
   * Initialize a new game with the specified options
   * 
   * @param options - Game initialization options
   * @returns A new game state
   */
  public initialize(options?: InitializeOptions): GameState {
    const difficulty = options?.difficulty ?? 3;
    const deck = options?.customDeck ?? arrangeDeckByDifficulty(difficulty, options?.seed);

    // Deal cards to tableau (1, 2, 3, ..., 7 cards per column)
    const tableau: any[][] = Array(TABLEAU_COLUMNS).fill(null).map(() => []);
    let deckIndex = 0;
    
    for (let col = 0; col < TABLEAU_COLUMNS; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[deckIndex];
        tableau[col].push({
          ...card,
          faceUp: row === col, // Only the top card is face up
        });
        deckIndex++;
      }
    }

    // Remaining cards go to the draw pile
    const drawPile = deck.slice(deckIndex);

    // Save initial board setup for replay/analysis if not using custom deck
    const initialBoardSetup = options?.customDeck ? undefined : {
      drawPile: [...drawPile],
      discardPile: [],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: tableau.map(col => [...col]),
    };

    return {
      drawPile,
      discardPile: [],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau,
      moveHistory: [],
      difficulty,
      gameWon: false,
      completionProgress: 0,
      initialBoardSetup,
    };
  }

  /**
   * Apply a move command to the game state
   * 
   * @param state - The current game state
   * @param command - The move command to apply
   * @returns A new game state with the move applied
   * @throws Error if the move is invalid
   */
  public applyMove(state: GameState, command: MoveCommand): GameState {
    switch (command.type) {
      case 'draw_card':
        return draw(state);
        
      case 'recycle_stock':
        return recycle(state);
        
      case 'tableau_to_tableau':
        return this.applyTableauToTableau(state, command);
        
      case 'tableau_to_foundation':
        return this.applyTableauToFoundation(state, command);
        
      case 'discard_to_tableau':
        return this.applyDiscardToTableau(state, command);
        
      case 'discard_to_foundation':
        return this.applyDiscardToFoundation(state, command);
        
      case 'flip_card':
        // Internal move type - not typically called directly
        return this.applyFlipCard(state, command);
        
      default:
        throw new Error(`Unknown move type: ${(command as any).type}`);
    }
  }

  /**
   * Apply tableau to tableau move
   */
  private applyTableauToTableau(state: GameState, command: MoveCommand): GameState {
    if (command.from?.column === undefined || command.to?.column === undefined) {
      throw new Error('Invalid tableau to tableau move: missing column information');
    }

    const srcCol = command.from.column;
    const destCol = command.to.column;
    const cardIndex = command.from.cardIndex ?? state.tableau[srcCol].length - 1;

    const sourcePile = state.tableau[srcCol];
    const cardsToMove = sourcePile.slice(cardIndex);
    const remainingCards = sourcePile.slice(0, cardIndex);

    // Flip the new top card if it exists and is face down
    if (remainingCards.length > 0 && !remainingCards[remainingCards.length - 1].faceUp) {
      const topCard = remainingCards[remainingCards.length - 1];
      remainingCards[remainingCards.length - 1] = { ...topCard, faceUp: true };
    }

    // Create new tableau with immutable updates
    const newTableau = state.tableau.map((pile, idx) => {
      if (idx === srcCol) return remainingCards;
      if (idx === destCol) return [...pile, ...cardsToMove];
      return pile;
    });

    return { ...state, tableau: newTableau };
  }

  /**
   * Apply tableau to foundation move
   */
  private applyTableauToFoundation(state: GameState, command: MoveCommand): GameState {
    if (command.from?.column === undefined || !command.to?.suit) {
      throw new Error('Invalid tableau to foundation move: missing information');
    }

    const srcCol = command.from.column;
    const suit = command.to.suit;

    const sourcePile = state.tableau[srcCol];
    if (sourcePile.length === 0) {
      throw new Error('Cannot move from empty tableau column');
    }

    const cardToMove = sourcePile[sourcePile.length - 1];
    const remainingCards = sourcePile.slice(0, -1);

    // Flip the new top card if it exists and is face down
    if (remainingCards.length > 0 && !remainingCards[remainingCards.length - 1].faceUp) {
      const topCard = remainingCards[remainingCards.length - 1];
      remainingCards[remainingCards.length - 1] = { ...topCard, faceUp: true };
    }

    // Create new tableau and foundations
    const newTableau = state.tableau.map((pile, idx) => {
      if (idx === srcCol) return remainingCards;
      return pile;
    });

    const newFoundations = {
      ...state.foundations,
      [suit]: [...state.foundations[suit], cardToMove],
    };

    return { ...state, tableau: newTableau, foundations: newFoundations };
  }

  /**
   * Apply discard to tableau move
   */
  private applyDiscardToTableau(state: GameState, command: MoveCommand): GameState {
    if (command.to?.column === undefined) {
      throw new Error('Invalid discard to tableau move: missing column');
    }

    if (state.discardPile.length === 0) {
      throw new Error('Cannot move from empty discard pile');
    }

    const destCol = command.to.column;
    const cardToMove = state.discardPile[state.discardPile.length - 1];
    const newDiscardPile = state.discardPile.slice(0, -1);

    const newTableau = state.tableau.map((pile, idx) => {
      if (idx === destCol) return [...pile, cardToMove];
      return pile;
    });

    return { ...state, discardPile: newDiscardPile, tableau: newTableau };
  }

  /**
   * Apply discard to foundation move
   */
  private applyDiscardToFoundation(state: GameState, command: MoveCommand): GameState {
    if (!command.to?.suit) {
      throw new Error('Invalid discard to foundation move: missing suit');
    }

    if (state.discardPile.length === 0) {
      throw new Error('Cannot move from empty discard pile');
    }

    const suit = command.to.suit;
    const cardToMove = state.discardPile[state.discardPile.length - 1];
    const newDiscardPile = state.discardPile.slice(0, -1);

    const newFoundations = {
      ...state.foundations,
      [suit]: [...state.foundations[suit], cardToMove],
    };

    return { ...state, discardPile: newDiscardPile, foundations: newFoundations };
  }

  /**
   * Apply flip card move (internal use)
   */
  private applyFlipCard(state: GameState, command: MoveCommand): GameState {
    if (command.from?.column === undefined) {
      throw new Error('Invalid flip card move: missing column');
    }

    const col = command.from.column;
    const cardIndex = command.from.cardIndex ?? state.tableau[col].length - 1;

    const newTableau = state.tableau.map((pile, idx) => {
      if (idx === col) {
        return pile.map((card, cardIdx) => {
          if (cardIdx === cardIndex) {
            return { ...card, faceUp: true };
          }
          return card;
        });
      }
      return pile;
    });

    return { ...state, tableau: newTableau };
  }

  /**
   * Check if a move command is valid in the current state
   * 
   * @param state - The current game state
   * @param command - The move command to check
   * @returns true if the move is valid, false otherwise
   */
  public canApplyMove(state: GameState, command: MoveCommand): boolean {
    try {
      switch (command.type) {
        case 'draw_card':
          return canDraw(state);
          
        case 'recycle_stock':
          return canRecycle(state);
          
        case 'tableau_to_tableau': {
          if (command.from?.column === undefined || command.from?.cardIndex === undefined || command.to?.column === undefined) {
            return false;
          }
          
          const sourcePile = state.tableau[command.from.column];
          if (!sourcePile || command.from.cardIndex >= sourcePile.length) {
            return false;
          }
          
          const card = sourcePile[command.from.cardIndex];
          if (!card.faceUp) {
            return false;
          }
          
          const cardsToMove = sourcePile.slice(command.from.cardIndex);
          const targetPile = state.tableau[command.to.column];
          
          return canMoveSequence(cardsToMove, targetPile);
        }
          
        case 'tableau_to_foundation': {
          if (command.from?.column === undefined || command.from?.cardIndex === undefined || !command.to?.suit) {
            return false;
          }
          
          const sourcePile = state.tableau[command.from.column];
          if (!sourcePile || command.from.cardIndex >= sourcePile.length) {
            return false;
          }
          
          const card = sourcePile[command.from.cardIndex];
          const foundationPile = state.foundations[command.to.suit];
          
          return canMoveToFoundation(card, foundationPile);
        }
          
        case 'discard_to_tableau': {
          if (state.discardPile.length === 0 || command.to?.column === undefined) {
            return false;
          }
          
          const card = state.discardPile[state.discardPile.length - 1];
          const targetPile = state.tableau[command.to.column];
          
          return canMoveToTableau(card, targetPile);
        }
          
        case 'discard_to_foundation': {
          if (state.discardPile.length === 0 || !command.to?.suit) {
            return false;
          }
          
          const card = state.discardPile[state.discardPile.length - 1];
          const foundationPile = state.foundations[command.to.suit];
          
          return canMoveToFoundation(card, foundationPile);
        }
          
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get all legal moves from the current state
   * 
   * @param state - The current game state
   * @returns Array of all legal move commands
   */
  public getLegalMoves(state: GameState): MoveCommand[] {
    const moves: MoveCommand[] = [];

    // 1. Stock/waste moves
    if (canDraw(state)) {
      moves.push({ type: 'draw_card' });
    } else if (canRecycle(state)) {
      moves.push({ type: 'recycle_stock' });
    }

    // 2. Discard pile moves (waste pile top card)
    if (state.discardPile.length > 0) {
      const topCard = state.discardPile[state.discardPile.length - 1];
      
      // Discard to foundation
      if (hasValidFoundationDestination(topCard, state.foundations)) {
        moves.push({
          type: 'discard_to_foundation',
          to: { suit: topCard.suit },
        });
      }
      
      // Discard to tableau
      const tableauDests = getValidTableauDestinations(topCard, state.tableau);
      for (const col of tableauDests) {
        moves.push({
          type: 'discard_to_tableau',
          to: { column: col },
        });
      }
    }

    // 3. Tableau moves
    for (let col = 0; col < TABLEAU_COLUMNS; col++) {
      const pile = state.tableau[col];
      if (pile.length === 0) continue;
      
      // Tableau to foundation (top card only)
      const topCard = pile[pile.length - 1];
      if (topCard.faceUp && hasValidFoundationDestination(topCard, state.foundations)) {
        moves.push({
          type: 'tableau_to_foundation',
          from: { column: col, cardIndex: pile.length - 1 },
          to: { suit: topCard.suit },
        });
      }
      
      // Tableau to tableau (all face-up card sequences)
      for (let cardIdx = 0; cardIdx < pile.length; cardIdx++) {
        const card = pile[cardIdx];
        if (!card.faceUp) continue;
        
        const sequence = pile.slice(cardIdx);
        const tableauDests = getValidTableauDestinations(card, state.tableau, col);
        
        for (const destCol of tableauDests) {
          moves.push({
            type: 'tableau_to_tableau',
            from: { column: col, cardIndex: cardIdx },
            to: { column: destCol },
          });
        }
      }
    }

    return moves;
  }

  /**
   * Check if the game is won
   * 
   * @param state - The current game state
   * @returns true if all 52 cards are in the foundations
   */
  public isWon(state: GameState): boolean {
    // Game is won if gameWon flag is set OR all foundations are complete
    if (state.gameWon) {
      return true;
    }
    
    // Check if all four foundations have all 13 cards
    return (
      state.foundations.hearts.length === CARDS_PER_SUIT &&
      state.foundations.diamonds.length === CARDS_PER_SUIT &&
      state.foundations.clubs.length === CARDS_PER_SUIT &&
      state.foundations.spades.length === CARDS_PER_SUIT
    );
  }

  /**
   * Check if the game is lost (no legal moves and not won)
   * 
   * @param state - The current game state
   * @returns true if there are no legal moves and the game is not won
   */
  public isLost(state: GameState): boolean {
    // Game is lost if not won and there are no legal moves
    if (this.isWon(state)) {
      return false;
    }
    
    return this.getLegalMoves(state).length === 0;
  }

  /**
   * Get the game completion progress as a percentage
   * 
   * @param state - The current game state
   * @returns Completion progress (0-100)
   */
  public getCompletionProgress(state: GameState): number {
    return calcCompletionProgress(state);
  }

  /**
   * Get the perceived difficulty score of the current state
   * Based on hidden cards, card distribution, etc.
   * 
   * @param state - The current game state
   * @returns Difficulty score (0-100)
   */
  public getPerceivedDifficulty(state: GameState): number {
    return calcPerceivedDifficulty(state);
  }

  /**
   * Export game state to JSON string
   * 
   * @param state - The game state to export
   * @returns JSON string representation
   */
  public exportState(state: GameState): string {
    return JSON.stringify(state, null, 2);
  }

  /**
   * Import game state from JSON string
   * 
   * @param json - JSON string to import
   * @returns Parsed game state
   * @throws Error if JSON is invalid or state is invalid
   */
  public importState(json: string): GameState {
    try {
      const state = JSON.parse(json) as GameState;
      
      // Validate the imported state
      validateGameState(state);
      
      return state;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON: ${error.message}`);
      }
      throw error;
    }
  }
}
