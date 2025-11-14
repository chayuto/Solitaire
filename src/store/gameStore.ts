import { create } from 'zustand';
import type { GameState, Card, Suit, Rank, Move } from '../types';

interface GameStore extends GameState {
  initializeGame: () => void;
  selectCard: (source: 'tableau' | 'discard', columnIndex?: number, cardIndex?: number) => void;
  deselectCard: () => void;
  moveCardToTableau: (targetColumn: number) => void;
  moveCardToFoundation: (suit: Suit) => void;
  canMoveToTableau: (card: Card, targetColumn: number) => boolean;
  canMoveToFoundation: (card: Card, suit: Suit) => boolean;
  exportGameState: () => string;
  importGameState: (jsonString: string) => boolean;
  exportMoveHistory: () => string;
  exportBoardSetup: () => string;
  drawCard: () => void;
  toggleValidMoves: () => void;
  toggleGodMode: () => void;
  toggleAutoPlay: () => void;
  performAutoPlayMove: () => void;
}

// Helper function to create a card
const createCard = (suit: Suit, rank: Rank, faceUp: boolean = false): Card => ({
  suit,
  rank,
  faceUp,
  id: `${suit}-${rank}`,
});

// Helper function to create a full deck
const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push(createCard(suit, rank));
    });
  });

  return deck;
};

// Helper function to shuffle array
const shuffle = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Initialize the game state
const initializeGameState = (): GameState => {
  const deck = shuffle(createDeck());
  const tableau: Card[][] = [[], [], [], [], [], [], []];
  
  // Deal cards to tableau
  let deckIndex = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck[deckIndex];
      card.faceUp = row === col; // Last card in each column is face up
      tableau[col].push(card);
      deckIndex++;
    }
  }

  // Remaining cards go to draw pile
  const drawPile = deck.slice(deckIndex);

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
    selectedCard: undefined,
    moveHistory: [],
    showValidMoves: true,
    godMode: false,
    autoPlayEnabled: false,
    autoPlayInProgress: false,
  };
};

// Helper function to get rank value (for validation)
const getRankValue = (rank: Rank): number => {
  const rankValues: Record<Rank, number> = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
  };
  return rankValues[rank];
};

// Helper function to check if card is red
const isRed = (suit: Suit): boolean => {
  return suit === 'hearts' || suit === 'diamonds';
};

// Helper function to record a move
const recordMove = (state: GameState, move: Move): Move[] => {
  return [...state.moveHistory, move];
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initializeGameState(),
  initializeGame: () => set(initializeGameState()),
  
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
    const column = state.tableau[targetColumn];
    
    // Empty column can only accept Kings
    if (column.length === 0) {
      return card.rank === 'K';
    }
    
    // Get the last card in the target column
    const targetCard = column[column.length - 1];
    
    // Must be face up
    if (!targetCard.faceUp) {
      return false;
    }
    
    // Must be opposite color
    if (isRed(card.suit) === isRed(targetCard.suit)) {
      return false;
    }
    
    // Must be one rank lower
    return getRankValue(card.rank) === getRankValue(targetCard.rank) - 1;
  },
  
  canMoveToFoundation: (card, suit) => {
    const state = get();
    const foundation = state.foundations[suit];
    
    // Must match suit
    if (card.suit !== suit) {
      return false;
    }
    
    // Empty foundation can only accept Aces
    if (foundation.length === 0) {
      return card.rank === 'A';
    }
    
    // Must be one rank higher than current top card
    const topCard = foundation[foundation.length - 1];
    return getRankValue(card.rank) === getRankValue(topCard.rank) + 1;
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
      
      set({ 
        tableau: newTableau, 
        selectedCard: undefined,
        moveHistory: [...state.moveHistory, ...newMoves],
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
      
      set({ 
        discardPile: newDiscardPile, 
        tableau: newTableau, 
        selectedCard: undefined,
        moveHistory: recordMove(state, move),
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
      
      set({ 
        tableau: newTableau, 
        foundations: newFoundations, 
        selectedCard: undefined,
        moveHistory: [...state.moveHistory, ...newMoves],
      });
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
      
      set({ 
        discardPile: newDiscardPile, 
        foundations: newFoundations, 
        selectedCard: undefined,
        moveHistory: recordMove(state, move),
      });
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
        moveHistory: recordMove(state, move),
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
      
      // Set the imported state (preserve move history and toggles if present)
      set({
        drawPile: importedState.drawPile,
        discardPile: importedState.discardPile,
        foundations: importedState.foundations,
        tableau: importedState.tableau,
        selectedCard: undefined,
        moveHistory: importedState.moveHistory || [],
        showValidMoves: importedState.showValidMoves ?? true,
        godMode: importedState.godMode ?? false,
        autoPlayEnabled: importedState.autoPlayEnabled ?? false,
        autoPlayInProgress: false,
      });
      
      return true;
    } catch (error) {
      console.error('Error importing game state:', error);
      return false;
    }
  },
  
  exportMoveHistory: () => {
    const state = get();
    return JSON.stringify(state.moveHistory, null, 2);
  },
  
  exportBoardSetup: () => {
    const state = get();
    // Export current board state without selected card or move history
    const boardSetup = {
      drawPile: state.drawPile,
      discardPile: state.discardPile,
      foundations: state.foundations,
      tableau: state.tableau,
    };
    return JSON.stringify(boardSetup, null, 2);
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
    set({ autoPlayEnabled: newAutoPlayEnabled });
    
    // If enabling auto-play, start the first move after a short delay
    if (newAutoPlayEnabled && !state.autoPlayInProgress) {
      setTimeout(() => {
        if (get().autoPlayEnabled) {
          get().performAutoPlayMove();
        }
      }, 500);
    }
  },

  performAutoPlayMove: () => {
    const state = get();
    
    // Don't proceed if auto-play is disabled or already in progress
    if (!state.autoPlayEnabled || state.autoPlayInProgress) {
      return;
    }

    set({ autoPlayInProgress: true });

    // Helper to check if a card can move to any foundation
    const tryMoveToFoundation = (card: Card, source: 'tableau' | 'discard', colIndex?: number, cardIndex?: number): boolean => {
      const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
      for (const suit of suits) {
        if (get().canMoveToFoundation(card, suit)) {
          // Select the card
          get().selectCard(source, colIndex, cardIndex);
          
          // Wait 200ms then move to foundation
          setTimeout(() => {
            get().moveCardToFoundation(suit);
            
            // Wait 1 second before next move
            setTimeout(() => {
              set({ autoPlayInProgress: false });
              if (get().autoPlayEnabled) {
                get().performAutoPlayMove();
              }
            }, 1000);
          }, 200);
          
          return true;
        }
      }
      return false;
    };

    // Helper to check if a card can move to any tableau column
    const tryMoveToTableau = (card: Card, source: 'tableau' | 'discard', colIndex?: number, cardIndex?: number): boolean => {
      for (let targetCol = 0; targetCol < 7; targetCol++) {
        if (source === 'tableau' && colIndex === targetCol) {
          continue; // Skip same column
        }
        
        if (get().canMoveToTableau(card, targetCol)) {
          // Select the card
          get().selectCard(source, colIndex, cardIndex);
          
          // Wait 200ms then move to tableau
          setTimeout(() => {
            get().moveCardToTableau(targetCol);
            
            // Wait 1 second before next move
            setTimeout(() => {
              set({ autoPlayInProgress: false });
              if (get().autoPlayEnabled) {
                get().performAutoPlayMove();
              }
            }, 1000);
          }, 200);
          
          return true;
        }
      }
      return false;
    };

    // Priority 1: Try to move discard pile card to foundation
    if (state.discardPile.length > 0) {
      const card = state.discardPile[state.discardPile.length - 1];
      if (tryMoveToFoundation(card, 'discard')) {
        return;
      }
    }

    // Priority 2: Try to move tableau cards to foundation
    for (let col = 0; col < state.tableau.length; col++) {
      const column = state.tableau[col];
      if (column.length > 0) {
        const card = column[column.length - 1];
        if (card.faceUp && tryMoveToFoundation(card, 'tableau', col, column.length - 1)) {
          return;
        }
      }
    }

    // Priority 3: Try to move discard pile card to tableau
    if (state.discardPile.length > 0) {
      const card = state.discardPile[state.discardPile.length - 1];
      if (tryMoveToTableau(card, 'discard')) {
        return;
      }
    }

    // Priority 4: Try to move tableau cards to other tableau columns
    for (let col = 0; col < state.tableau.length; col++) {
      const column = state.tableau[col];
      // Try to move stacks of cards (starting from the bottom face-up card)
      for (let cardIndex = 0; cardIndex < column.length; cardIndex++) {
        const card = column[cardIndex];
        if (card.faceUp && tryMoveToTableau(card, 'tableau', col, cardIndex)) {
          return;
        }
      }
    }

    // Priority 5: If no moves available, draw a card
    if (state.drawPile.length > 0 || state.discardPile.length > 0) {
      get().drawCard();
      
      // Wait 1 second before next move
      setTimeout(() => {
        set({ autoPlayInProgress: false });
        if (get().autoPlayEnabled) {
          get().performAutoPlayMove();
        }
      }, 1000);
      return;
    }

    // No moves available - stop auto-play
    set({ autoPlayEnabled: false, autoPlayInProgress: false });
  },
}));
