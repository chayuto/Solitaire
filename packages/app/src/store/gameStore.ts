import { create } from 'zustand';
import type { GameState, Card, Suit, Move, Difficulty } from '../types';
import {
  arrangeDeckByDifficulty,
  canMoveToTableau as canMoveToTableauCore,
  canMoveToFoundation as canMoveToFoundationCore,
  hasValidFoundationDestination as hasValidFoundationDestinationCore,
  hashGameState,
  getRankValue,
  isRed,
  getPerceivedDifficulty,
  getCompletionProgress,
  getValidTableauDestinations,
} from '@chayuto/solitaire-core';
import {
  hasAnyValidDestination as hasAnyValidDestinationHelper,
  hasAnyValidMoves,
  isGameWon,
  canAutoComplete,
  getStateHashAfterMove,
} from './uiHelpers';
import { uiToCore } from '../adapters/coreAdapter';
import { DEFAULT_DIFFICULTY, TABLEAU_COLUMNS } from '../constants';

/**
 * GameStore interface extending GameState with action methods
 * Manages all game logic and state mutations for Solitaire
 */
interface GameStore extends GameState {
  initializeGame: (difficulty?: Difficulty) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  selectCard: (source: 'tableau' | 'discard', columnIndex?: number, cardIndex?: number) => void;
  deselectCard: () => void;
  moveCardToTableau: (targetColumn: number) => void;
  moveCardToFoundation: (suit: Suit) => void;
  canMoveToTableau: (card: Card, targetColumn: number) => boolean;
  canMoveToFoundation: (card: Card, suit: Suit) => boolean;
  hasValidTableauDestination: (card: Card, sourceColumn?: number) => boolean;
  hasValidFoundationDestination: (card: Card) => boolean;
  hasAnyValidDestination: (card: Card, source: 'tableau' | 'discard', columnIndex?: number, cardIndex?: number) => boolean;
  exportGameState: () => string;
  importGameState: (jsonString: string) => boolean;
  drawCard: () => void;
  toggleValidMoves: () => void;
  toggleGodMode: () => void;
  toggleAutoPlay: () => void;
  performAutoPlayMove: () => void;
  checkAndTriggerAutoComplete: () => void;
  startReplay: () => void;
  pauseReplay: () => void;
  resumeReplay: () => void;
  stopReplay: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  setReplaySpeed: (speed: number) => void;
  goToReplayIndex: (index: number) => void;
}

/**
 * Initializes a new game state with the specified difficulty
 * Deals cards to tableau and sets up initial game conditions
 * @param difficulty - Game difficulty level (default: 3 = Normal)
 * @returns Complete initial game state
 */
const initializeGameState = (difficulty: Difficulty = DEFAULT_DIFFICULTY): GameState => {
  const deck = arrangeDeckByDifficulty(difficulty);
  const tableau: Card[][] = Array(TABLEAU_COLUMNS).fill(null).map(() => []);
  
  // Deal cards to tableau (1 card to first column, 2 to second, etc.)
  let deckIndex = 0;
  for (let col = 0; col < TABLEAU_COLUMNS; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck[deckIndex];
      // Create new card object with faceUp property set (core cards are readonly)
      const tableauCard = { ...card, faceUp: row === col };
      tableau[col].push(tableauCard);
      deckIndex++;
    }
  }

  // Remaining cards go to draw pile
  const drawPile = deck.slice(deckIndex);

  // Create a deep copy of the initial board setup for metrics
  const initialBoardSetup = {
    drawPile: JSON.parse(JSON.stringify(drawPile)),
    discardPile: [],
    foundations: {
      hearts: [],
      diamonds: [],
      clubs: [],
      spades: [],
    },
    tableau: JSON.parse(JSON.stringify(tableau)),
  };

  const initialState: GameState = {
    drawPile,
    discardPile: [],
    foundations: {
      hearts: [],
      diamonds: [],
      clubs: [],
      spades: [],
    },
    tableau,
    selectedCard: undefined,
    moveHistory: [],
    showValidMoves: true,
    godMode: false,
    autoPlayEnabled: false,
    autoPlayInProgress: false,
    autoPlayStateHistory: [],
    difficulty,
    gameWon: false,
    initialBoardSetup,
    perceivedDifficulty: undefined, // Will be calculated below
    completionProgress: 0, // Start at 0% completion
    replayMode: false,
    replayIndex: 0,
    replayPaused: false,
    replaySpeed: 1000, // 1 second per move
  };

  // Calculate perceived difficulty after initialState is created
  initialState.perceivedDifficulty = getPerceivedDifficulty(uiToCore(initialState));

  return initialState;
};



export const useGameStore = create<GameStore>((set, get) => ({
  ...initializeGameState(),
  initializeGame: (difficulty?: Difficulty) => {
    const currentDifficulty = difficulty ?? get().difficulty ?? 3;
    set(initializeGameState(currentDifficulty));
  },
  setDifficulty: (difficulty: Difficulty) => set({ difficulty }),
  
  selectCard: (source, columnIndex, cardIndex) => {
    const state = get();
    
    if (source === 'tableau' && columnIndex !== undefined && cardIndex !== undefined) {
      const column = state.tableau[columnIndex];
      const card = column[cardIndex];
      
      // Only allow selecting face-up cards
      if (card.faceUp) {
        set({
          selectedCard: {
            source: 'tableau',
            columnIndex,
            cardIndex,
            card,
          },
        });
      }
    } else if (source === 'discard') {
      const topCard = state.discardPile[state.discardPile.length - 1];
      if (topCard) {
        set({
          selectedCard: {
            source: 'discard',
            card: topCard,
          },
        });
      }
    }
  },
  
  deselectCard: () => {
    set({ selectedCard: undefined });
  },
  
  canMoveToTableau: (card, targetColumn) => {
    const state = get();
    return canMoveToTableauCore(card, state.tableau[targetColumn]);
  },
  
  canMoveToFoundation: (card, suit) => {
    const state = get();
    return canMoveToFoundationCore(card, state.foundations[suit]);
  },
  
  hasValidTableauDestination: (card, sourceColumn) => {
    const state = get();
    const destinations = getValidTableauDestinations(card, state.tableau, sourceColumn);
    return destinations.length > 0;
  },
  
  hasValidFoundationDestination: (card) => {
    const state = get();
    return hasValidFoundationDestinationCore(card, state.foundations);
  },
  
  hasAnyValidDestination: (card, source, columnIndex, cardIndex) => {
    const state = get();
    return hasAnyValidDestinationHelper(card, source, state, columnIndex, cardIndex);
  },
  
  moveCardToTableau: (targetColumn) => {
    const state = get();
    const selected = state.selectedCard;
    
    if (!selected) return;
    
    // Check if move is valid
    if (!get().canMoveToTableau(selected.card, targetColumn)) {
      return;
    }
    
    const newTableau = [...state.tableau];
    const newMoves: Move[] = [];
    
    if (selected.source === 'tableau' && selected.columnIndex !== undefined && selected.cardIndex !== undefined) {
      // Move from tableau to tableau (can move multiple cards)
      const sourceColumn = [...state.tableau[selected.columnIndex]];
      const cardsToMove = sourceColumn.slice(selected.cardIndex);
      const remainingCards = sourceColumn.slice(0, selected.cardIndex);
      
      // Record the move for each card moved
      cardsToMove.forEach((card, index) => {
        newMoves.push({
          type: 'tableau_to_tableau',
          timestamp: Date.now() + index,
          card,
          from: {
            source: 'tableau',
            columnIndex: selected.columnIndex,
            cardIndex: selected.cardIndex! + index,
          },
          to: {
            target: 'tableau',
            columnIndex: targetColumn,
          },
        });
      });
      
      // Flip the last remaining card if it exists and is face down
      if (remainingCards.length > 0 && !remainingCards[remainingCards.length - 1].faceUp) {
        const flippedCard = {
          ...remainingCards[remainingCards.length - 1],
          faceUp: true,
        };
        remainingCards[remainingCards.length - 1] = flippedCard;
        
        // Record the flip
        newMoves.push({
          type: 'flip_card',
          timestamp: Date.now() + cardsToMove.length,
          card: flippedCard,
          from: {
            source: 'tableau',
            columnIndex: selected.columnIndex,
            cardIndex: remainingCards.length - 1,
          },
        });
      }
      
      newTableau[selected.columnIndex] = remainingCards;
      newTableau[targetColumn] = [...newTableau[targetColumn], ...cardsToMove];
      
      const updatedState = {
        ...state,
        tableau: newTableau,
        moveHistory: [...state.moveHistory, ...newMoves],
      };
      
      set({ 
        tableau: newTableau, 
        selectedCard: undefined,
        moveHistory: [...state.moveHistory, ...newMoves],
        completionProgress: getCompletionProgress(uiToCore(updatedState)),
      });
    } else if (selected.source === 'discard') {
      // Move from discard to tableau
      const newDiscardPile = state.discardPile.slice(0, -1);
      newTableau[targetColumn] = [...newTableau[targetColumn], selected.card];
      
      // Record the move
      const move: Move = {
        type: 'discard_to_tableau',
        timestamp: Date.now(),
        card: selected.card,
        from: {
          source: 'discard',
        },
        to: {
          target: 'tableau',
          columnIndex: targetColumn,
        },
      };
      
      const updatedState = {
        ...state,
        discardPile: newDiscardPile,
        tableau: newTableau,
        moveHistory: [...state.moveHistory, move],
      };
      
      set({ 
        discardPile: newDiscardPile, 
        tableau: newTableau, 
        selectedCard: undefined,
        moveHistory: [...state.moveHistory, move],
        completionProgress: getCompletionProgress(uiToCore(updatedState)),
      });
    }
  },
  
  moveCardToFoundation: (suit) => {
    const state = get();
    const selected = state.selectedCard;
    
    if (!selected) return;
    
    // Check if move is valid
    if (!get().canMoveToFoundation(selected.card, suit)) {
      return;
    }
    
    const newMoves: Move[] = [];
    
    // Only single cards can move to foundation
    if (selected.source === 'tableau' && selected.columnIndex !== undefined && selected.cardIndex !== undefined) {
      const sourceColumn = state.tableau[selected.columnIndex];
      // Only allow if it's the last card in the column
      if (selected.cardIndex !== sourceColumn.length - 1) {
        return;
      }
      
      const newTableau = [...state.tableau];
      const newColumn = [...sourceColumn];
      newColumn.pop();
      
      // Record the move
      newMoves.push({
        type: 'tableau_to_foundation',
        timestamp: Date.now(),
        card: selected.card,
        from: {
          source: 'tableau',
          columnIndex: selected.columnIndex,
          cardIndex: selected.cardIndex,
        },
        to: {
          target: 'foundation',
          suit,
        },
      });
      
      // Flip the last remaining card if it exists and is face down
      if (newColumn.length > 0 && !newColumn[newColumn.length - 1].faceUp) {
        const flippedCard = {
          ...newColumn[newColumn.length - 1],
          faceUp: true,
        };
        newColumn[newColumn.length - 1] = flippedCard;
        
        // Record the flip
        newMoves.push({
          type: 'flip_card',
          timestamp: Date.now() + 1,
          card: flippedCard,
          from: {
            source: 'tableau',
            columnIndex: selected.columnIndex,
            cardIndex: newColumn.length - 1,
          },
        });
      }
      
      newTableau[selected.columnIndex] = newColumn;
      const newFoundations = { ...state.foundations };
      newFoundations[suit] = [...newFoundations[suit], selected.card];
      
      const updatedState = {
        ...state,
        tableau: newTableau, 
        foundations: newFoundations, 
        selectedCard: undefined,
        moveHistory: [...state.moveHistory, ...newMoves],
      };
      
      set({
        ...updatedState,
        selectedCard: undefined,
        completionProgress: getCompletionProgress(uiToCore(updatedState)),
      });
      
      // Check for win condition
      const newState = get();
      if (isGameWon(newState)) {
        set({ gameWon: true, autoPlayEnabled: false, autoPlayInProgress: false });
      } else {
        // Check if auto-complete should be triggered
        get().checkAndTriggerAutoComplete();
      }
    } else if (selected.source === 'discard') {
      const newDiscardPile = state.discardPile.slice(0, -1);
      const newFoundations = { ...state.foundations };
      newFoundations[suit] = [...newFoundations[suit], selected.card];
      
      // Record the move
      const move: Move = {
        type: 'discard_to_foundation',
        timestamp: Date.now(),
        card: selected.card,
        from: {
          source: 'discard',
        },
        to: {
          target: 'foundation',
          suit,
        },
      };
      
      const updatedState = {
        ...state,
        discardPile: newDiscardPile, 
        foundations: newFoundations, 
        selectedCard: undefined,
        moveHistory: [...state.moveHistory, move],
      };
      
      set({
        ...updatedState,
        selectedCard: undefined,
        completionProgress: getCompletionProgress(uiToCore(updatedState)),
      });
      
      // Check for win condition
      const newState = get();
      if (isGameWon(newState)) {
        set({ gameWon: true, autoPlayEnabled: false, autoPlayInProgress: false });
      } else {
        // Check if auto-complete should be triggered
        get().checkAndTriggerAutoComplete();
      }
    }
  },
  
  drawCard: () => {
    const state = get();
    
    if (state.drawPile.length === 0) {
      // Reset draw pile from discard pile
      const newDrawPile = [...state.discardPile].reverse().map(card => ({
        ...card,
        faceUp: false,
      }));
      set({ drawPile: newDrawPile, discardPile: [] });
    } else {
      // Draw a card from draw pile to discard pile
      const card = state.drawPile[0];
      const drawnCard = { ...card, faceUp: true };
      const newDrawPile = state.drawPile.slice(1);
      const newDiscardPile = [...state.discardPile, drawnCard];
      
      // Record the move
      const move: Move = {
        type: 'draw_card',
        timestamp: Date.now(),
        card: drawnCard,
        from: {
          source: 'draw',
        },
      };
      
      set({ 
        drawPile: newDrawPile, 
        discardPile: newDiscardPile,
        moveHistory: [...state.moveHistory, move],
      });
    }
  },
  
  exportGameState: () => {
    const state = get();
    const exportState: GameState = {
      drawPile: state.drawPile,
      discardPile: state.discardPile,
      foundations: state.foundations,
      tableau: state.tableau,
      moveHistory: state.moveHistory,
      showValidMoves: state.showValidMoves,
      godMode: state.godMode,
      autoPlayEnabled: state.autoPlayEnabled,
      autoPlayInProgress: state.autoPlayInProgress,
      difficulty: state.difficulty,
      gameWon: state.gameWon,
      initialBoardSetup: state.initialBoardSetup,
      perceivedDifficulty: state.perceivedDifficulty,
      completionProgress: state.completionProgress,
      replayMode: state.replayMode,
      replayIndex: state.replayIndex,
      replayPaused: state.replayPaused,
      replaySpeed: state.replaySpeed,
    };
    return JSON.stringify(exportState, null, 2);
  },
  
  importGameState: (jsonString: string) => {
    try {
      const importedState = JSON.parse(jsonString) as GameState;
      
      // Validate the imported state
      if (!importedState.drawPile || !importedState.discardPile || 
          !importedState.foundations || !importedState.tableau) {
        return false;
      }
      
      // Validate foundations
      if (!importedState.foundations.hearts || !importedState.foundations.diamonds ||
          !importedState.foundations.clubs || !importedState.foundations.spades) {
        return false;
      }
      
      // Validate tableau has 7 columns
      if (!Array.isArray(importedState.tableau) || importedState.tableau.length !== 7) {
        return false;
      }
      
      // Calculate metrics for imported state
      const importedStateForCalc: GameState = {
        ...importedState,
        selectedCard: undefined,
        autoPlayInProgress: false,
      };
      const completionProgress = getCompletionProgress(uiToCore(importedStateForCalc));
      const perceivedDifficulty = importedState.perceivedDifficulty ?? getPerceivedDifficulty(uiToCore(importedStateForCalc));
      
      // Set the imported state
      // Note: gameWon is set to false to allow replay functionality for won games
      set({
        drawPile: importedState.drawPile,
        discardPile: importedState.discardPile,
        foundations: importedState.foundations,
        tableau: importedState.tableau,
        selectedCard: undefined,
        moveHistory: importedState.moveHistory,
        showValidMoves: importedState.showValidMoves,
        godMode: importedState.godMode,
        autoPlayEnabled: importedState.autoPlayEnabled,
        autoPlayInProgress: false,
        difficulty: importedState.difficulty,
        gameWon: false, // Always set to false to allow replay even for won games
        initialBoardSetup: importedState.initialBoardSetup,
        perceivedDifficulty,
        completionProgress,
        replayMode: false,
        replayIndex: 0,
        replayPaused: false,
        replaySpeed: importedState.replaySpeed ?? 1000,
      });
      
      return true;
    } catch (error) {
      console.error('Error importing game state:', error);
      return false;
    }
  },
  
  toggleValidMoves: () => {
    set((state) => ({ showValidMoves: !state.showValidMoves }));
  },
  
  toggleGodMode: () => {
    set((state) => ({ godMode: !state.godMode }));
  },

  toggleAutoPlay: () => {
    const state = get();
    const newAutoPlayEnabled = !state.autoPlayEnabled;
    
    if (newAutoPlayEnabled) {
      // Log auto-play start event
      const move: Move = {
        type: 'autoplay_start',
        timestamp: Date.now(),
        card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'autoplay-marker' },
      };
      set({ 
        autoPlayEnabled: newAutoPlayEnabled,
        autoPlayStateHistory: [],
        moveHistory: [...state.moveHistory, move],
      });
      
      // Start the first move after a short delay
      if (!state.autoPlayInProgress) {
        setTimeout(() => {
          if (get().autoPlayEnabled) {
            get().performAutoPlayMove();
          }
        }, 500);
      }
    } else {
      // Log auto-play stop event
      const move: Move = {
        type: 'autoplay_stop',
        timestamp: Date.now(),
        card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'autoplay-marker' },
      };
      set({ 
        autoPlayEnabled: newAutoPlayEnabled,
        autoPlayStateHistory: [],
        moveHistory: [...state.moveHistory, move],
      });
    }
  },

  performAutoPlayMove: () => {
    const state = get();
    
    // Don't proceed if auto-play is disabled or already in progress
    if (!state.autoPlayEnabled || state.autoPlayInProgress) {
      return;
    }

    set({ autoPlayInProgress: true });
    
    // Check for loop detection - track the current game state
    const currentStateHash = hashGameState(uiToCore(state));
    const stateHistory = state.autoPlayStateHistory || [];
    
    // Check if we've seen this state before (loop detection)
    // We'll track the last 20 states for better loop detection
    if (stateHistory.includes(currentStateHash)) {
      // Loop detected
      const move: Move = {
        type: 'autoplay_loop_detected',
        timestamp: Date.now(),
        card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'autoplay-marker' },
      };
      set({ 
        autoPlayEnabled: false, 
        autoPlayInProgress: false,
        autoPlayStateHistory: [],
        moveHistory: [...state.moveHistory, move],
      });
      return;
    }
    
    // Add current state to history BEFORE executing move (keep last 20 states)
    // This ensures predictive loop detection and next call's loop check work correctly
    const updatedStateHistory = [...stateHistory, currentStateHash].slice(-20);
    set({ autoPlayStateHistory: updatedStateHistory });

    // Type for possible moves
    interface PossibleMove {
      score: number;
      card: Card;
      source: 'tableau' | 'discard';
      sourceColumn?: number;
      sourceCardIndex?: number;
      targetType: 'foundation' | 'tableau';
      targetColumn?: number;
      targetSuit?: Suit;
    }

    // Helper to get face-down card at a specific position in tableau
    const getFaceDownCard = (colIndex: number, cardIndex: number): Card | null => {
      if (colIndex < 0 || colIndex >= state.tableau.length) return null;
      const column = state.tableau[colIndex];
      if (cardIndex < 0 || cardIndex >= column.length) return null;
      const card = column[cardIndex];
      return !card.faceUp ? card : null;
    };

    // Helper to count face-down cards in a column
    const countFaceDownCards = (colIndex: number): number => {
      if (colIndex < 0 || colIndex >= state.tableau.length) return 0;
      return state.tableau[colIndex].filter(card => !card.faceUp).length;
    };

    // Helper to check if revealing a card would be valuable
    const evaluateRevealValue = (colIndex: number, cardIndex: number): number => {
      const revealedCard = getFaceDownCard(colIndex, cardIndex);
      if (!revealedCard) return 0;
      
      let value = 50; // Base value for revealing any card
      
      // Higher value for revealing high-value cards (Kings, Queens, Jacks)
      if (revealedCard.rank === 'K') value += 30; // Kings can start new columns
      if (revealedCard.rank === 'Q') value += 20;
      if (revealedCard.rank === 'J') value += 15;
      
      // Higher value for revealing Aces (can go directly to foundation)
      if (revealedCard.rank === 'A') value += 40;
      
      // Bonus for revealing cards that could fit on current tableau
      const cardValue = getRankValue(revealedCard.rank);
      for (let col = 0; col < state.tableau.length; col++) {
        if (col === colIndex) continue;
        const column = state.tableau[col];
        if (column.length > 0) {
          const topCard = column[column.length - 1];
          if (topCard.faceUp) {
            const topValue = getRankValue(topCard.rank);
            // Check if revealed card could be played on this column
            if (cardValue === topValue - 1 && isRed(revealedCard.suit) !== isRed(topCard.suit)) {
              value += 25; // Card has immediate playability
            }
          }
        }
      }
      
      // Bonus if this is the last face-down card in the column
      if (countFaceDownCards(colIndex) === 1) {
        value += 30;
      }
      
      return value;
    };

    // Helper to check if there's a King available (face-up) in tableau or discard
    const hasKingAvailable = (): boolean => {
      // Check discard pile
      if (state.discardPile.length > 0) {
        const topCard = state.discardPile[state.discardPile.length - 1];
        if (topCard.rank === 'K') return true;
      }
      // Check tableau
      for (const column of state.tableau) {
        for (let i = 0; i < column.length; i++) {
          const card = column[i];
          if (card.faceUp && card.rank === 'K') {
            // Make sure it's moveable (top of a sequence)
            return true;
          }
        }
      }
      return false;
    };

    // Helper to calculate foundation evenness penalty
    const getFoundationUnevennessScore = (): number => {
      const levels = [
        state.foundations.hearts.length,
        state.foundations.diamonds.length,
        state.foundations.clubs.length,
        state.foundations.spades.length,
      ];
      const max = Math.max(...levels);
      const min = Math.min(...levels);
      return max - min; // Higher difference = more uneven
    };

    // Helper to check if a card is needed for tableau building
    const isCardNeededForTableau = (card: Card): boolean => {
      const cardValue = getRankValue(card.rank);
      // Check all tableau columns to see if this card could help build sequences
      for (let col = 0; col < state.tableau.length; col++) {
        const column = state.tableau[col];
        if (column.length > 0) {
          const topCard = column[column.length - 1];
          if (topCard.faceUp) {
            const topValue = getRankValue(topCard.rank);
            // This card could be placed on the top card
            if (cardValue === topValue - 1 && isRed(card.suit) !== isRed(topCard.suit)) {
              return true;
            }
          }
        }
        // Check if any face-down card underneath would need this card
        for (let i = 0; i < column.length; i++) {
          const hiddenCard = getFaceDownCard(col, i);
          if (hiddenCard) {
            const hiddenValue = getRankValue(hiddenCard.rank);
            // The hidden card could be placed on this card
            if (hiddenValue === cardValue - 1 && isRed(hiddenCard.suit) !== isRed(card.suit)) {
              return true;
            }
          }
        }
      }
      return false;
    };

    // NEW SCORING SYSTEM: Follows 5 priorities in strict order
    // Priority #1: Unlock Tableau (1000000+ points)
    // Priority #2: King Management (100000+ points)  
    // Priority #3: Foundation Handling (10000+ points)
    // Priority #4: Draw Pile Management (1000+ points)
    // Priority #5: Flexibility (100+ points)
    const scoreMove = (move: PossibleMove): number => {
      let score = 0;
      const { source, sourceColumn, sourceCardIndex, targetType, targetColumn } = move;
      const cardValue = getRankValue(move.card.rank);

      // PRIORITY #1: UNLOCK THE TABLEAU (1000000+)
      // Always play from tableau before draw pile
      if (source === 'tableau') {
        // Check if this move reveals a face-down card
        const revealsCard = sourceColumn !== undefined && sourceCardIndex !== undefined && 
                           sourceCardIndex > 0 && !state.tableau[sourceColumn][sourceCardIndex - 1].faceUp;
        
        if (revealsCard) {
          // Moves that reveal cards get the massive bonus
          score += 1000000; // Massive bonus for revealing moves
          
          // Prioritize moves from columns with MORE face-down cards
          if (sourceColumn !== undefined) {
            const faceDownCount = countFaceDownCards(sourceColumn);
            score += faceDownCount * 50000; // More face-down = higher priority
          }
          
          // Extra bonus based on what's revealed
          if (sourceColumn !== undefined && sourceCardIndex !== undefined) {
            score += 100000; // Big bonus for revealing cards
            const revealValue = evaluateRevealValue(sourceColumn, sourceCardIndex - 1);
            score += revealValue * 100; // Scale up reveal value
          }
        } else {
          // Moves that don't reveal cards get much lower base score
          // Only slightly better than draw pile moves
          score += 2000; // Small bonus - avoid unless necessary
          
          // Additional penalty for moving single cards to tableau without revealing
          // This prevents useless back-and-forth moves that cause loops
          if (targetType === 'tableau' && sourceCardIndex !== undefined && sourceColumn !== undefined) {
            const numCardsMoving = state.tableau[sourceColumn].length - sourceCardIndex;
            if (numCardsMoving === 1) {
              // Moving just one card without revealing anything - likely useless
              // Heavy penalty to make it much less attractive than drawing or other moves
              score -= 10000; // Strong penalty to avoid useless moves
            }
          }
        }
      } else {
        // Draw pile moves get much lower base score (only do when tableau exhausted)
        score += 1000; // Still positive but much lower than tableau
      }

      // PRIORITY #2: KING MANAGEMENT (100000+)
      if (targetType === 'tableau' && targetColumn !== undefined) {
        const targetCol = state.tableau[targetColumn];
        
        // Moving to empty column
        if (targetCol.length === 0) {
          if (move.card.rank === 'K') {
            score += 100000; // Good - Kings go to empty spaces
            
            // Prefer Kings from columns with MORE face-down cards
            if (source === 'tableau' && sourceColumn !== undefined) {
              const faceDownCount = countFaceDownCards(sourceColumn);
              score += faceDownCount * 10000;
            }
            
            // Strategic King placement: check what cards need to be unblocked
            // Prefer Kings that will help unblock stuck cards
            for (let col = 0; col < state.tableau.length; col++) {
              if (col === sourceColumn) continue;
              const column = state.tableau[col];
              for (let i = column.length - 1; i >= 0; i--) {
                const card = column[i];
                if (card.faceUp && getRankValue(card.rank) === 12) { // Queen
                  // Check if this Queen needs a King of opposite color
                  if (isRed(card.suit) !== isRed(move.card.suit)) {
                    score += 20000; // Bonus for King that unblocks a Queen
                  }
                }
              }
            }
          } else {
            // Never create empty column without a King!
            score -= 900000; // Massive penalty
          }
        }
        
        // Check if this move would empty a column
        if (source === 'tableau' && sourceColumn !== undefined && sourceCardIndex === 0) {
          // We're about to empty a column
          if (!hasKingAvailable()) {
            score -= 500000; // Large penalty if no King is ready
          }
        }
      }

      // PRIORITY #3: FOUNDATION HANDLING (10000+)
      if (targetType === 'foundation') {
        // Always play Aces and 2s immediately
        if (move.card.rank === 'A') {
          score += 50000; // Highest foundation priority
        } else if (move.card.rank === '2') {
          score += 45000; // Second highest
        } else if (cardValue <= 4) {
          // 3s and 4s: check if needed for tableau
          if (isCardNeededForTableau(move.card)) {
            score += 5000; // Lower priority - might be needed
          } else {
            score += 35000; // Safe to move
          }
        } else {
          // 5+ cards: be very cautious
          if (isCardNeededForTableau(move.card)) {
            score -= 20000; // Don't move if needed!
          } else {
            score += 10000; // OK to move if not needed
          }
        }
        
        // Build foundations evenly - penalize if this would make foundations uneven
        const currentUnevenness = getFoundationUnevennessScore();
        // Simulate the move
        const newLevel = state.foundations[move.card.suit].length + 1;
        const otherLevels = [
          state.foundations.hearts.length,
          state.foundations.diamonds.length,
          state.foundations.clubs.length,
          state.foundations.spades.length,
        ].filter((_, i) => ['hearts', 'diamonds', 'clubs', 'spades'][i] !== move.card.suit);
        otherLevels.push(newLevel);
        const maxLevel = Math.max(...otherLevels);
        const minLevel = Math.min(...otherLevels);
        const newUnevenness = maxLevel - minLevel;
        
        if (newUnevenness > currentUnevenness) {
          score -= (newUnevenness - currentUnevenness) * 5000; // Penalty for making uneven
        }
      }

      // PRIORITY #4: DRAW PILE MANAGEMENT (1000+)
      if (source === 'discard') {
        // Penalty for using draw pile cards - but less for foundation moves
        if (targetType === 'foundation') {
          // Foundation moves from discard are OK, just slightly lower priority
          score -= 5000; // Small penalty - still want to prioritize tableau first
        } else if (targetType === 'tableau') {
          // Heavy penalty for using draw pile cards for tableau
          score -= 50000; // Discourage draw pile use for tableau
          
          const targetCol = state.tableau[targetColumn!];
          
          // Exception 1: Placing strategic King
          if (move.card.rank === 'K' && targetCol.length === 0) {
            score += 80000; // OK to use draw pile King for empty column
          }
          
          // Exception 2: Helps unlock tableau cards
          // Check if target column has face-down cards
          const targetFaceDownCount = countFaceDownCards(targetColumn!);
          if (targetFaceDownCount > 3) {
            score += 30000; // Helps build on column that needs progress
          }
        }
      }

      // PRIORITY #5: FLEXIBILITY AND OPTIONS (100+)
      if (targetType === 'tableau' && targetColumn !== undefined) {
        const targetCol = state.tableau[targetColumn];
        
        if (targetCol.length > 0) {
          // Building on non-empty column
          score += 500; // Base flexibility bonus
          
          // Bonus for building longer sequences
          const numCardsToMove = source === 'tableau' && sourceColumn !== undefined && sourceCardIndex !== undefined
            ? state.tableau[sourceColumn].length - sourceCardIndex
            : 1;
          score += numCardsToMove * 100;
          
          // Prefer to keep diverse stacks - check if we're creating suit diversity
          if (source === 'tableau' && sourceColumn !== undefined) {
            // Check if we're creating suit diversity
            let targetHasRed = false;
            let targetHasBlack = false;
            for (const card of targetCol) {
              if (card.faceUp) {
                if (isRed(card.suit)) targetHasRed = true;
                else targetHasBlack = true;
              }
            }
            
            const movingIsRed = isRed(move.card.suit);
            if ((movingIsRed && !targetHasRed) || (!movingIsRed && !targetHasBlack)) {
              score += 200; // Bonus for adding suit diversity
            }
          }
          
          // Don't commit to moves that reduce options
          // Prefer columns with fewer face-down cards for flexibility
          const targetFaceDownCount = countFaceDownCards(targetColumn);
          if (targetFaceDownCount <= 2) {
            score += 300; // Bonus for building on nearly-clear columns
          }
        }
      }

      return score;
    };

    // Collect all possible moves
    const possibleMoves: PossibleMove[] = [];

    // Check discard pile moves
    if (state.discardPile.length > 0) {
      const card = state.discardPile[state.discardPile.length - 1];
      
      // Check foundation moves
      const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
      for (const suit of suits) {
        if (get().canMoveToFoundation(card, suit)) {
          possibleMoves.push({
            score: 0, // Will be calculated by scoreMove
            card,
            source: 'discard',
            targetType: 'foundation',
            targetSuit: suit,
          });
        }
      }
      
      // Check tableau moves
      for (let targetCol = 0; targetCol < 7; targetCol++) {
        if (get().canMoveToTableau(card, targetCol)) {
          possibleMoves.push({
            score: 0,
            card,
            source: 'discard',
            targetType: 'tableau',
            targetColumn: targetCol,
          });
        }
      }
    }

    // Check tableau moves
    for (let col = 0; col < state.tableau.length; col++) {
      const column = state.tableau[col];
      for (let cardIndex = 0; cardIndex < column.length; cardIndex++) {
        const card = column[cardIndex];
        if (!card.faceUp) continue;

        // Check foundation moves (only for last card in column)
        if (cardIndex === column.length - 1) {
          const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
          for (const suit of suits) {
            if (get().canMoveToFoundation(card, suit)) {
              possibleMoves.push({
                score: 0,
                card,
                source: 'tableau',
                sourceColumn: col,
                sourceCardIndex: cardIndex,
                targetType: 'foundation',
                targetSuit: suit,
              });
            }
          }
        }

        // Check tableau moves
        for (let targetCol = 0; targetCol < 7; targetCol++) {
          if (targetCol === col) continue;
          if (get().canMoveToTableau(card, targetCol)) {
            possibleMoves.push({
              score: 0,
              card,
              source: 'tableau',
              sourceColumn: col,
              sourceCardIndex: cardIndex,
              targetType: 'tableau',
              targetColumn: targetCol,
            });
          }
        }
      }
    }

    // Score all moves
    possibleMoves.forEach(move => {
      move.score = scoreMove(move);
    });

    // Filter out moves that would result in loop states (predictive loop detection)
    // Use updatedStateHistory (which includes current state) instead of stateHistory
    const nonLoopingMoves = possibleMoves.filter(move => {
      const futureStateHash = getStateHashAfterMove(state, move);
      return !updatedStateHistory.includes(futureStateHash);
    });

    // If all possible moves would lead to loops, detect it as a loop condition
    if (possibleMoves.length > 0 && nonLoopingMoves.length === 0) {
      const move: Move = {
        type: 'autoplay_loop_detected',
        timestamp: Date.now(),
        card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'autoplay-marker' },
      };
      set({ 
        autoPlayEnabled: false, 
        autoPlayInProgress: false,
        autoPlayStateHistory: [],
        moveHistory: [...state.moveHistory, move],
      });
      return;
    }

    // Sort by score (highest first)
    nonLoopingMoves.sort((a, b) => b.score - a.score);
    
    // Filter out moves with negative scores (useless moves)
    // These are moves that are worse than drawing a card
    const worthwhileMoves = nonLoopingMoves.filter(move => move.score > 0);

    // Check if we're in fast auto-complete mode (all tableau cards face up and no draw pile)
    const isAutoCompleteMode = state.drawPile.length === 0 && 
      state.tableau.every(col => col.every(card => card.faceUp));
    const moveDelay = isAutoCompleteMode ? 100 : 1000;
    const selectDelay = isAutoCompleteMode ? 50 : 200;

    // Execute the best move if we have worthwhile moves
    if (worthwhileMoves.length > 0) {
      const bestMove = worthwhileMoves[0];
      
      // Select the card
      get().selectCard(bestMove.source, bestMove.sourceColumn, bestMove.sourceCardIndex);
      
      // Wait before executing the move
      setTimeout(() => {
        if (bestMove.targetType === 'foundation' && bestMove.targetSuit) {
          get().moveCardToFoundation(bestMove.targetSuit);
        } else if (bestMove.targetType === 'tableau' && bestMove.targetColumn !== undefined) {
          get().moveCardToTableau(bestMove.targetColumn);
        }
        
        // Wait before next move
        setTimeout(() => {
          set({ autoPlayInProgress: false });
          if (get().autoPlayEnabled) {
            get().performAutoPlayMove();
          }
        }, moveDelay);
      }, selectDelay);
      
      return;
    }

    // If no moves available, draw a card
    if (state.drawPile.length > 0 || state.discardPile.length > 0) {
      get().drawCard();
      
      // Wait before next move
      setTimeout(() => {
        set({ autoPlayInProgress: false });
        if (get().autoPlayEnabled) {
          get().performAutoPlayMove();
        }
      }, moveDelay);
      return;
    }

    // Check for deadend - no valid moves available
    const currentState = get();
    if (!hasAnyValidMoves(currentState)) {
      const move: Move = {
        type: 'autoplay_deadend',
        timestamp: Date.now(),
        card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'autoplay-marker' },
      };
      set({ 
        autoPlayEnabled: false, 
        autoPlayInProgress: false,
        autoPlayStateHistory: [],
        moveHistory: [...currentState.moveHistory, move],
      });
      return;
    }

    // No moves available - stop auto-play (shouldn't reach here, but safety net)
    set({ autoPlayEnabled: false, autoPlayInProgress: false, autoPlayStateHistory: [] });
  },

  checkAndTriggerAutoComplete: () => {
    const state = get();
    
    // Don't trigger if already won or if auto-play is already active
    if (state.gameWon || state.autoPlayEnabled) {
      return;
    }
    
    // Check if auto-complete conditions are met
    if (canAutoComplete(state)) {
      // Enable auto-play with fast mode (0.1s delay)
      set({ autoPlayEnabled: true, autoPlayStateHistory: [] });
      
      // Start the first move after a short delay
      setTimeout(() => {
        if (get().autoPlayEnabled) {
          get().performAutoPlayMove();
        }
      }, 100);
    }
  },

  startReplay: () => {
    const state = get();
    if (state.moveHistory.length === 0) return;
    
    // Reset to initial state and start replay
    set({
      replayMode: true,
      replayIndex: 0,
      replayPaused: false,
      autoPlayEnabled: false,
      autoPlayInProgress: false,
    });
    
    // Apply moves up to index 0 (essentially reset to initial state)
    get().goToReplayIndex(0);
    
    // Start auto-replay
    setTimeout(() => {
      const currentState = get();
      if (currentState.replayMode && !currentState.replayPaused) {
        get().stepForward();
      }
    }, state.replaySpeed);
  },

  pauseReplay: () => {
    set({ replayPaused: true });
  },

  resumeReplay: () => {
    const state = get();
    set({ replayPaused: false });
    
    // Continue auto-replay if not at the end
    if (state.replayIndex < state.moveHistory.length) {
      setTimeout(() => {
        const currentState = get();
        if (currentState.replayMode && !currentState.replayPaused) {
          get().stepForward();
        }
      }, state.replaySpeed);
    }
  },

  stopReplay: () => {
    set({
      replayMode: false,
      replayPaused: false,
      replayIndex: 0,
    });
  },

  stepForward: () => {
    const state = get();
    if (!state.replayMode || state.replayIndex >= state.moveHistory.length) return;
    
    const newIndex = state.replayIndex + 1;
    get().goToReplayIndex(newIndex);
    
    // Continue auto-replay if not paused and not at the end
    if (!state.replayPaused && newIndex < state.moveHistory.length) {
      setTimeout(() => {
        const currentState = get();
        if (currentState.replayMode && !currentState.replayPaused) {
          get().stepForward();
        }
      }, state.replaySpeed);
    }
  },

  stepBackward: () => {
    const state = get();
    if (!state.replayMode || state.replayIndex <= 0) return;
    
    const newIndex = state.replayIndex - 1;
    get().goToReplayIndex(newIndex);
  },

  setReplaySpeed: (speed: number) => {
    set({ replaySpeed: speed });
  },

  goToReplayIndex: (index: number) => {
    const state = get();
    if (!state.replayMode || !state.initialBoardSetup) return;
    
    // Clamp index to valid range
    const targetIndex = Math.max(0, Math.min(index, state.moveHistory.length));
    
    // Reset to initial board setup
    const newState: Partial<GameState> = {
      drawPile: JSON.parse(JSON.stringify(state.initialBoardSetup.drawPile)),
      discardPile: JSON.parse(JSON.stringify(state.initialBoardSetup.discardPile)),
      foundations: JSON.parse(JSON.stringify(state.initialBoardSetup.foundations)),
      tableau: JSON.parse(JSON.stringify(state.initialBoardSetup.tableau)),
      selectedCard: undefined,
      replayIndex: targetIndex,
    };
    
    // Apply moves up to targetIndex
    for (let i = 0; i < targetIndex; i++) {
      const move = state.moveHistory[i];
      
      switch (move.type) {
        case 'draw_card': {
          // Draw a card
          if (newState.drawPile && newState.drawPile.length > 0) {
            const card = newState.drawPile[0];
            const drawnCard = { ...card, faceUp: true };
            newState.drawPile = newState.drawPile.slice(1);
            newState.discardPile = [...(newState.discardPile || []), drawnCard];
          } else if (newState.discardPile && newState.discardPile.length > 0) {
            // Reset draw pile from discard pile
            newState.drawPile = [...newState.discardPile].reverse().map(card => ({
              ...card,
              faceUp: false,
            }));
            newState.discardPile = [];
          }
          break;
        }
        
        case 'tableau_to_tableau': {
          if (move.from?.columnIndex !== undefined && move.to?.columnIndex !== undefined && newState.tableau) {
            const sourceColumn = [...newState.tableau[move.from.columnIndex]];
            const cardIndex = move.from.cardIndex !== undefined ? move.from.cardIndex : sourceColumn.length - 1;
            const cardsToMove = sourceColumn.slice(cardIndex, cardIndex + 1);
            const remainingCards = sourceColumn.slice(0, cardIndex);
            
            newState.tableau[move.from.columnIndex] = remainingCards;
            newState.tableau[move.to.columnIndex] = [...newState.tableau[move.to.columnIndex], ...cardsToMove];
          }
          break;
        }
        
        case 'tableau_to_foundation': {
          if (move.from?.columnIndex !== undefined && move.to?.suit && newState.tableau && newState.foundations) {
            const sourceColumn = [...newState.tableau[move.from.columnIndex]];
            const card = sourceColumn.pop();
            if (card) {
              newState.tableau[move.from.columnIndex] = sourceColumn;
              newState.foundations[move.to.suit] = [...newState.foundations[move.to.suit], card];
            }
          }
          break;
        }
        
        case 'discard_to_tableau': {
          if (move.to?.columnIndex !== undefined && newState.discardPile && newState.tableau) {
            const card = newState.discardPile.pop();
            if (card) {
              newState.tableau[move.to.columnIndex] = [...newState.tableau[move.to.columnIndex], card];
            }
          }
          break;
        }
        
        case 'discard_to_foundation': {
          if (move.to?.suit && newState.discardPile && newState.foundations) {
            const card = newState.discardPile.pop();
            if (card) {
              newState.foundations[move.to.suit] = [...newState.foundations[move.to.suit], card];
            }
          }
          break;
        }
        
        case 'flip_card': {
          if (move.from?.columnIndex !== undefined && move.from.cardIndex !== undefined && newState.tableau) {
            const column = [...newState.tableau[move.from.columnIndex]];
            if (column[move.from.cardIndex]) {
              column[move.from.cardIndex] = { ...column[move.from.cardIndex], faceUp: true };
              newState.tableau[move.from.columnIndex] = column;
            }
          }
          break;
        }
      }
    }
    
    // Calculate completion progress for the current replay state
    const tempState: GameState = {
      ...state,
      ...newState,
      drawPile: newState.drawPile!,
      discardPile: newState.discardPile!,
      foundations: newState.foundations!,
      tableau: newState.tableau!,
    };
    const completionProgress = getCompletionProgress(uiToCore(tempState));
    
    set({
      ...newState,
      completionProgress,
    });
  },
}));
