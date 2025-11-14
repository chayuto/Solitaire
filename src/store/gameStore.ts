import { create } from 'zustand';
import type { GameState, Card, Suit, Move, Difficulty } from '../types';
import { 
  arrangeDeckByDifficulty,
  canMoveToTableau as canMoveToTableauHelper,
  canMoveToFoundation as canMoveToFoundationHelper,
  hasValidTableauDestination as hasValidTableauDestinationHelper,
  hasValidFoundationDestination as hasValidFoundationDestinationHelper,
  hasAnyValidDestination as hasAnyValidDestinationHelper,
  hasAnyValidMoves,
  isGameWon,
  canAutoComplete,
  calculatePerceivedDifficulty,
  calculateCompletionProgress,
  getGameStateHash,
  getStateHashAfterMove,
  getRankValue,
  isRed,
} from './helpers';
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
      card.faceUp = row === col; // Last card in each column is face up
      tableau[col].push(card);
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
    perceivedDifficulty: calculatePerceivedDifficulty(initialBoardSetup),
    completionProgress: 0, // Start at 0% completion
  };

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
    return canMoveToTableauHelper(card, targetColumn, state.tableau);
  },
  
  canMoveToFoundation: (card, suit) => {
    const state = get();
    return canMoveToFoundationHelper(card, suit, state.foundations);
  },
  
  hasValidTableauDestination: (card, sourceColumn) => {
    const state = get();
    return hasValidTableauDestinationHelper(card, state.tableau, sourceColumn);
  },
  
  hasValidFoundationDestination: (card) => {
    const state = get();
    return hasValidFoundationDestinationHelper(card, state.foundations);
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
        completionProgress: calculateCompletionProgress(updatedState),
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
        completionProgress: calculateCompletionProgress(updatedState),
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
        completionProgress: calculateCompletionProgress(updatedState),
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
        completionProgress: calculateCompletionProgress(updatedState),
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
      const completionProgress = calculateCompletionProgress(importedStateForCalc);
      const perceivedDifficulty = importedState.perceivedDifficulty ?? calculatePerceivedDifficulty(importedState.initialBoardSetup);
      
      // Set the imported state
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
        gameWon: importedState.gameWon,
        initialBoardSetup: importedState.initialBoardSetup,
        perceivedDifficulty,
        completionProgress,
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
    const currentStateHash = getGameStateHash(state);
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
    
    // Update state history (keep last 20 states for better loop detection)
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

    // Helper to score a move (higher is better)
    const scoreMove = (move: PossibleMove): number => {
      let score = move.score;
      const { source, sourceColumn, sourceCardIndex, targetType, targetColumn } = move;

      // Bonus for moves to foundation (always good, but consider strategic timing)
      if (targetType === 'foundation') {
        score += 100;
        // Extra bonus for Aces and 2s (start building foundations early)
        if (move.card.rank === 'A') score += 50;
        if (move.card.rank === '2') score += 30;
        
        // Strategic consideration: Don't rush to move small cards to foundation too early
        // if they might be useful for building tableau sequences
        const cardValue = getRankValue(move.card.rank);
        if (cardValue <= 3 && state.drawPile.length > 15) {
          // Slight penalty for moving very small cards early unless needed
          // Check if this card could be useful for tableau moves
          let hasTableauUse = false;
          for (let col = 0; col < state.tableau.length; col++) {
            const column = state.tableau[col];
            if (column.length > 0) {
              const topCard = column[column.length - 1];
              // If there's a 4 or 5 on tableau, we might want to keep 2/3
              if (topCard.faceUp && getRankValue(topCard.rank) === cardValue + 1) {
                hasTableauUse = true;
                break;
              }
            }
          }
          if (!hasTableauUse) score += 20; // Safe to move if no tableau use
        }
        
        return score;
      }

      // For tableau moves, apply smart heuristics with face-down card knowledge
      if (targetType === 'tableau' && targetColumn !== undefined) {
        // Check if this move reveals a face-down card
        if (source === 'tableau' && sourceColumn !== undefined && sourceCardIndex !== undefined) {
          const sourceCol = state.tableau[sourceColumn];
          if (sourceCardIndex > 0 && !sourceCol[sourceCardIndex - 1].faceUp) {
            // Use face-down card knowledge to evaluate reveal value
            const revealValue = evaluateRevealValue(sourceColumn, sourceCardIndex - 1);
            score += revealValue; // Strategic bonus based on what's underneath
          }
          
          // Check if we're emptying a column
          if (sourceCardIndex === 0) {
            // Emptying a column is good only if we're moving a King
            if (move.card.rank === 'K') {
              score -= 50; // Penalty for moving King to non-empty (waste of empty space)
            } else {
              score += 60; // Good to empty column for future King placement
              
              // Extra consideration: check if there's a useful King in face-down cards
              // that we might want this space for
              let hasHiddenKing = false;
              for (let col = 0; col < state.tableau.length; col++) {
                for (let cardIdx = 0; cardIdx < state.tableau[col].length; cardIdx++) {
                  const hiddenCard = getFaceDownCard(col, cardIdx);
                  if (hiddenCard && hiddenCard.rank === 'K') {
                    hasHiddenKing = true;
                    break;
                  }
                }
                if (hasHiddenKing) break;
              }
              if (hasHiddenKing) {
                score += 20; // Extra bonus if there's a hidden King that might need this space
              }
            }
          }
        }

        const targetCol = state.tableau[targetColumn];
        
        // Penalty for moving to empty column (unless it's a King or reveals a card)
        if (targetCol.length === 0) {
          if (move.card.rank !== 'K') {
            score -= 100; // Heavy penalty for non-King to empty column
          } else {
            // Moving King to empty column - evaluate based on what's underneath source
            score += 40;
            // Extra bonus if this reveals a card
            if (source === 'tableau' && sourceColumn !== undefined && sourceCardIndex !== undefined) {
              const sourceCol = state.tableau[sourceColumn];
              if (sourceCardIndex > 0 && !sourceCol[sourceCardIndex - 1].faceUp) {
                const revealValue = evaluateRevealValue(sourceColumn, sourceCardIndex - 1);
                score += revealValue; // Strategic reveal bonus
              }
            }
            
            // Consider which King to move if multiple Kings are available
            // Prefer to move Kings from columns with fewer face-down cards
            if (source === 'tableau' && sourceColumn !== undefined) {
              const faceDownCount = countFaceDownCards(sourceColumn);
              score -= faceDownCount * 5; // Slight penalty per face-down card
            }
          }
        } else {
          // Moving to non-empty column
          score += 30;
          
          // Bonus for building longer sequences
          const numCardsToMove = source === 'tableau' && sourceColumn !== undefined && sourceCardIndex !== undefined
            ? state.tableau[sourceColumn].length - sourceCardIndex
            : 1;
          score += numCardsToMove * 5;
          
          // Strategic consideration: Check if target column has many face-down cards
          // Prefer to build on columns with fewer face-down cards to maintain flexibility
          const targetFaceDownCount = countFaceDownCards(targetColumn);
          if (targetFaceDownCount > 3) {
            score -= 10; // Slight penalty for building on columns with many hidden cards
          }
        }

        // Penalty for moving from discard to tableau if we haven't cycled through draw pile
        if (source === 'discard' && state.drawPile.length > 10) {
          score -= 20; // Prefer to see more cards first
        }

        // Check if this move might block future moves
        // Enhanced blocking detection with face-down card knowledge
        if (source === 'discard' && targetCol.length > 0) {
          const targetCard = targetCol[targetCol.length - 1];
          const cardValue = getRankValue(move.card.rank);
          const targetValue = getRankValue(targetCard.rank);
          
          // Check if we're potentially blocking
          if (cardValue > targetValue - 1 && isRed(move.card.suit) === isRed(targetCard.suit)) {
            score -= 15;
          }
          
          // Check if this card might block access to important face-down cards
          // Look for cards in tableau that need this card's rank
          for (let col = 0; col < state.tableau.length; col++) {
            if (col === targetColumn) continue;
            for (let cardIdx = 0; cardIdx < state.tableau[col].length; cardIdx++) {
              const hiddenCard = getFaceDownCard(col, cardIdx);
              if (hiddenCard) {
                const hiddenValue = getRankValue(hiddenCard.rank);
                // If we're placing a card that the hidden card needs to stack on
                if (hiddenValue === cardValue - 1 && isRed(hiddenCard.suit) !== isRed(move.card.suit)) {
                  score -= 25; // Penalty for potentially blocking a needed card
                }
              }
            }
          }
        }
        
        // Strategic consideration for tableau-to-tableau moves
        if (source === 'tableau' && sourceColumn !== undefined && targetCol.length > 0) {
          // Check if this move helps or hinders accessing face-down cards
          const sourceFaceDownCount = countFaceDownCards(sourceColumn);
          const targetFaceDownCount = countFaceDownCards(targetColumn);
          
          // Prefer moves that help reveal cards from columns with more face-down cards
          if (sourceFaceDownCount > targetFaceDownCount) {
            score += 15; // Bonus for moving from a column that needs more reveals
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
    const nonLoopingMoves = possibleMoves.filter(move => {
      const futureStateHash = getStateHashAfterMove(state, move);
      return !stateHistory.includes(futureStateHash);
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

    // Check if we're in fast auto-complete mode (all tableau cards face up and no draw pile)
    const isAutoCompleteMode = state.drawPile.length === 0 && 
      state.tableau.every(col => col.every(card => card.faceUp));
    const moveDelay = isAutoCompleteMode ? 100 : 1000;
    const selectDelay = isAutoCompleteMode ? 50 : 200;

    // Execute the best move
    if (nonLoopingMoves.length > 0) {
      const bestMove = nonLoopingMoves[0];
      
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
}));
