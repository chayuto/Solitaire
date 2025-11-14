import { create } from 'zustand';
import type { GameState, Card, Suit, Rank, Move, Difficulty } from '../types';

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

// Helper function to shuffle array (full random shuffle)
const shuffle = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Helper function to partially shuffle array based on difficulty
// Lower difficulty = less shuffling (easier), higher difficulty = more challenging positions
const partialShuffle = <T,>(array: T[], shufflePercentage: number): T[] => {
  const result = [...array];
  const numSwaps = Math.floor((array.length * shufflePercentage) / 100);
  
  for (let i = 0; i < numSwaps; i++) {
    const idx1 = Math.floor(Math.random() * array.length);
    const idx2 = Math.floor(Math.random() * array.length);
    [result[idx1], result[idx2]] = [result[idx2], result[idx1]];
  }
  
  return result;
};

// Helper function to arrange deck based on difficulty
const arrangeDeckByDifficulty = (difficulty: Difficulty): Card[] => {
  const deck = createDeck();
  
  switch (difficulty) {
    case 1: // Very Easy - minimal shuffle with favorable arrangement
      // Start with ordered deck then apply 20% shuffle
      return partialShuffle(deck, 20);
    
    case 2: // Easy - partial shuffle (50%)
      return partialShuffle(deck, 50);
    
    case 3: // Normal - full random shuffle (default)
      return shuffle(deck);
    
    case 4: // Hard - shuffle then bias towards blocking positions
      // Full shuffle with 30% additional swaps to create challenging positions
      return partialShuffle(shuffle(deck), 30);
    
    case 5: // Very Hard - heavy shuffle to create difficult scenarios
      // Double shuffle for maximum randomization and difficulty
      return shuffle(shuffle(deck));
    
    default:
      return shuffle(deck);
  }
};

// Initialize the game state
const initializeGameState = (difficulty: Difficulty = 3): GameState => {
  const deck = arrangeDeckByDifficulty(difficulty);
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

  // Create a deep copy of the initial board setup
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

// Helper function to generate a hash of the current game state
const getGameStateHash = (state: GameState): string => {
  // Create a simplified representation of the game state
  const stateSnapshot = {
    drawPile: state.drawPile.map(c => c.id),
    discardPile: state.discardPile.map(c => c.id),
    foundations: {
      hearts: state.foundations.hearts.map(c => c.id),
      diamonds: state.foundations.diamonds.map(c => c.id),
      clubs: state.foundations.clubs.map(c => c.id),
      spades: state.foundations.spades.map(c => c.id),
    },
    tableau: state.tableau.map(col => col.map(c => ({ id: c.id, faceUp: c.faceUp }))),
  };
  return JSON.stringify(stateSnapshot);
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

// Helper function to check if any valid moves exist
const hasAnyValidMoves = (state: GameState): boolean => {
  // Check if discard pile has any valid moves
  if (state.discardPile.length > 0) {
    const discardCard = state.discardPile[state.discardPile.length - 1];
    
    // Check foundation
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    for (const suit of suits) {
      const foundation = state.foundations[suit];
      if (discardCard.suit === suit) {
        if (foundation.length === 0 && discardCard.rank === 'A') {
          return true;
        }
        if (foundation.length > 0) {
          const topCard = foundation[foundation.length - 1];
          if (getRankValue(discardCard.rank) === getRankValue(topCard.rank) + 1) {
            return true;
          }
        }
      }
    }
    
    // Check tableau
    for (let col = 0; col < state.tableau.length; col++) {
      const column = state.tableau[col];
      if (column.length === 0 && discardCard.rank === 'K') {
        return true;
      }
      if (column.length > 0) {
        const targetCard = column[column.length - 1];
        if (targetCard.faceUp && 
            isRed(discardCard.suit) !== isRed(targetCard.suit) &&
            getRankValue(discardCard.rank) === getRankValue(targetCard.rank) - 1) {
          return true;
        }
      }
    }
  }
  
  // Check tableau cards
  for (let col = 0; col < state.tableau.length; col++) {
    const column = state.tableau[col];
    for (let cardIndex = 0; cardIndex < column.length; cardIndex++) {
      const card = column[cardIndex];
      if (!card.faceUp) continue;
      
      // Check if can move to foundation (only last card)
      if (cardIndex === column.length - 1) {
        const foundation = state.foundations[card.suit];
        if (foundation.length === 0 && card.rank === 'A') {
          return true;
        }
        if (foundation.length > 0) {
          const topCard = foundation[foundation.length - 1];
          if (getRankValue(card.rank) === getRankValue(topCard.rank) + 1) {
            return true;
          }
        }
      }
      
      // Check if can move to another tableau column
      for (let targetCol = 0; targetCol < state.tableau.length; targetCol++) {
        if (targetCol === col) continue;
        const targetColumn = state.tableau[targetCol];
        
        if (targetColumn.length === 0 && card.rank === 'K') {
          return true;
        }
        if (targetColumn.length > 0) {
          const targetCard = targetColumn[targetColumn.length - 1];
          if (targetCard.faceUp && 
              isRed(card.suit) !== isRed(targetCard.suit) &&
              getRankValue(card.rank) === getRankValue(targetCard.rank) - 1) {
            return true;
          }
        }
      }
    }
  }
  
  // Check if we can draw more cards
  if (state.drawPile.length > 0) {
    return true;
  }
  
  // Check if we can reset the draw pile
  if (state.drawPile.length === 0 && state.discardPile.length > 0) {
    return true;
  }
  
  return false;
};

// Helper function to check if game is won (all 52 cards in foundations)
const isGameWon = (state: GameState): boolean => {
  const totalCardsInFoundations = 
    state.foundations.hearts.length +
    state.foundations.diamonds.length +
    state.foundations.clubs.length +
    state.foundations.spades.length;
  return totalCardsInFoundations === 52;
};

// Helper function to check if tableau cards are sorted (all face up and in proper sequence)
// and draw pile is empty, triggering auto-complete
const canAutoComplete = (state: GameState): boolean => {
  // Draw pile must be empty
  if (state.drawPile.length > 0) {
    return false;
  }
  
  // All tableau cards must be face up
  for (const column of state.tableau) {
    for (const card of column) {
      if (!card.faceUp) {
        return false;
      }
    }
  }
  
  // Check if there's at least one card that can be moved to foundation
  // This ensures we have something to auto-complete
  for (const column of state.tableau) {
    if (column.length > 0) {
      const card = column[column.length - 1];
      const foundation = state.foundations[card.suit];
      
      // Can this card go to foundation?
      if (foundation.length === 0 && card.rank === 'A') {
        return true;
      }
      if (foundation.length > 0) {
        const topCard = foundation[foundation.length - 1];
        if (getRankValue(card.rank) === getRankValue(topCard.rank) + 1) {
          return true;
        }
      }
    }
  }
  
  // Also check discard pile
  if (state.discardPile.length > 0) {
    const card = state.discardPile[state.discardPile.length - 1];
    const foundation = state.foundations[card.suit];
    
    if (foundation.length === 0 && card.rank === 'A') {
      return true;
    }
    if (foundation.length > 0) {
      const topCard = foundation[foundation.length - 1];
      if (getRankValue(card.rank) === getRankValue(topCard.rank) + 1) {
        return true;
      }
    }
  }
  
  return false;
};

// Calculate perceived difficulty based on initial board setup
// Returns a score from 0-100 (higher = more difficult)
// Returns undefined if no initial board setup is available
const calculatePerceivedDifficulty = (initialBoardSetup?: GameState['initialBoardSetup']): number | undefined => {
  if (!initialBoardSetup) {
    return undefined;
  }

  let difficultyScore = 0;
  const { tableau, drawPile } = initialBoardSetup;

  // Factor 1: Buried aces and low cards (0-30 points)
  // Aces and 2s buried deep in tableau columns are harder to access
  let buriedLowCardsScore = 0;
  tableau.forEach(column => {
    column.forEach((card, index) => {
      if (!card.faceUp) {
        const rankValue = getRankValue(card.rank);
        // Aces and 2s are critical for starting foundations
        if (rankValue <= 2) {
          // Deeper burial = higher score (more difficult)
          const depthFactor = (column.length - index) / column.length;
          buriedLowCardsScore += depthFactor * 5; // Max 5 points per buried low card
        }
      }
    });
  });
  difficultyScore += Math.min(buriedLowCardsScore, 30);

  // Factor 2: Face-down card distribution (0-25 points)
  // More face-down cards = harder game
  let totalFaceDown = 0;
  tableau.forEach(column => {
    totalFaceDown += column.filter(card => !card.faceUp).length;
  });
  // There are 21 face-down cards in standard deal (0+1+2+3+4+5+6)
  const faceDownRatio = totalFaceDown / 21;
  difficultyScore += faceDownRatio * 25;

  // Factor 3: Empty columns (0-15 points)
  // Starting with empty columns is unusual and can be either easier or harder
  // We'll count it as slightly negative since it gives flexibility
  const emptyColumns = tableau.filter(col => col.length === 0).length;
  difficultyScore -= emptyColumns * 5; // Each empty column reduces difficulty

  // Factor 4: Card sequence potential (0-20 points)
  // Check how many cards in tableau can immediately form sequences
  let sequencePotential = 0;
  const faceUpCards = tableau.flatMap(col => col.filter(card => card.faceUp));
  faceUpCards.forEach(card => {
    const canFormSequence = faceUpCards.some(otherCard => 
      card !== otherCard &&
      isRed(card.suit) !== isRed(otherCard.suit) &&
      getRankValue(card.rank) === getRankValue(otherCard.rank) - 1
    );
    if (canFormSequence) {
      sequencePotential += 1;
    }
  });
  // More immediate sequences = easier game
  const maxPossibleSequences = 7; // Rough estimate
  difficultyScore -= (sequencePotential / maxPossibleSequences) * 20;

  // Factor 5: Draw pile size (0-10 points)
  // More cards in draw pile = more options but also more to work through
  const drawPileRatio = drawPile.length / 24; // 24 is standard draw pile size
  difficultyScore += drawPileRatio * 10;

  // Normalize to 0-100 range
  difficultyScore = Math.max(0, Math.min(100, difficultyScore));
  
  return Math.round(difficultyScore);
};

// Calculate game completion progress (0-100%)
const calculateCompletionProgress = (state: GameState): number => {
  // Count cards in foundations (winning condition)
  const foundationCards = 
    state.foundations.hearts.length +
    state.foundations.diamonds.length +
    state.foundations.clubs.length +
    state.foundations.spades.length;
  
  // Total cards in a standard deck
  const totalCards = 52;
  
  // Basic progress: cards in foundation / total cards
  const basicProgress = (foundationCards / totalCards) * 100;
  
  // Bonus progress for face-up cards in tableau (showing progress even when not in foundation)
  const tableauFaceUpCards = state.tableau.reduce((count, column) => 
    count + column.filter(card => card.faceUp).length, 0
  );
  
  // Initial face-up cards in standard deal is 7 (one per column)
  // Additional face-up cards show progress in revealing the board
  const additionalFaceUp = Math.max(0, tableauFaceUpCards - 7);
  
  // Give 0.5% bonus for each additional face-up card (max ~7 points for fully revealed board)
  const faceUpBonus = Math.min(additionalFaceUp * 0.5, 7);
  
  // Combine the scores
  const totalProgress = basicProgress + faceUpBonus;
  
  // Cap at 100%
  return Math.min(100, Math.round(totalProgress * 10) / 10); // Round to 1 decimal place
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
  
  hasValidTableauDestination: (card, sourceColumn) => {
    const state = get();
    
    // Check all tableau columns for valid destinations
    for (let col = 0; col < state.tableau.length; col++) {
      // Skip the source column if provided
      if (sourceColumn !== undefined && col === sourceColumn) {
        continue;
      }
      
      if (get().canMoveToTableau(card, col)) {
        return true;
      }
    }
    
    return false;
  },
  
  hasValidFoundationDestination: (card) => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    
    // Check all foundations for valid destinations
    for (const suit of suits) {
      if (get().canMoveToFoundation(card, suit)) {
        return true;
      }
    }
    
    return false;
  },
  
  hasAnyValidDestination: (card, source, columnIndex, cardIndex) => {
    const state = get();
    
    // For tableau cards, only check if it's the bottom-most card of a sequence
    // (we can move multiple cards but only check the first one in the sequence)
    if (source === 'tableau' && columnIndex !== undefined && cardIndex !== undefined) {
      const column = state.tableau[columnIndex];
      
      // Only allow checking cards that can actually be moved
      // (must be face up, and if not last card, all cards below must be in valid sequence)
      if (!card.faceUp) {
        return false;
      }
      
      // Check if this is the last card (can go to foundation or tableau)
      if (cardIndex === column.length - 1) {
        return get().hasValidFoundationDestination(card) || get().hasValidTableauDestination(card, columnIndex);
      }
      
      // If not the last card, can only move to tableau (not foundation)
      return get().hasValidTableauDestination(card, columnIndex);
    }
    
    // For discard pile, check both foundation and tableau
    if (source === 'discard') {
      return get().hasValidFoundationDestination(card) || get().hasValidTableauDestination(card);
    }
    
    return false;
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
        moveHistory: recordMove(state, move),
      };
      
      set({ 
        discardPile: newDiscardPile, 
        tableau: newTableau, 
        selectedCard: undefined,
        moveHistory: recordMove(state, move),
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
        moveHistory: recordMove(state, move),
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
        moveHistory: recordMove(state, move),
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
        moveHistory: recordMove(state, move),
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
        moveHistory: recordMove(state, move),
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

    // Helper to score a move (higher is better)
    const scoreMove = (move: PossibleMove): number => {
      let score = move.score;
      const { source, sourceColumn, sourceCardIndex, targetType, targetColumn } = move;

      // Bonus for moves to foundation (always good)
      if (targetType === 'foundation') {
        score += 100;
        // Extra bonus for Aces and 2s (start building foundations early)
        if (move.card.rank === 'A') score += 50;
        if (move.card.rank === '2') score += 30;
        return score;
      }

      // For tableau moves, apply smart heuristics
      if (targetType === 'tableau' && targetColumn !== undefined) {
        // Check if this move reveals a face-down card
        if (source === 'tableau' && sourceColumn !== undefined && sourceCardIndex !== undefined) {
          const sourceCol = state.tableau[sourceColumn];
          if (sourceCardIndex > 0 && !sourceCol[sourceCardIndex - 1].faceUp) {
            score += 80; // High bonus for revealing cards
          }
          
          // Check if we're emptying a column
          if (sourceCardIndex === 0) {
            // Emptying a column is good only if we're moving a King
            if (move.card.rank === 'K') {
              score -= 50; // Penalty for moving King to non-empty (waste of empty space)
            } else {
              score += 60; // Good to empty column for future King placement
            }
          }
        }

        const targetCol = state.tableau[targetColumn];
        
        // Penalty for moving to empty column (unless it's a King or reveals a card)
        if (targetCol.length === 0) {
          if (move.card.rank !== 'K') {
            score -= 100; // Heavy penalty for non-King to empty column
          } else {
            // Moving King to empty column
            score += 40;
            // Extra bonus if this reveals a card
            if (source === 'tableau' && sourceColumn !== undefined && sourceCardIndex !== undefined) {
              const sourceCol = state.tableau[sourceColumn];
              if (sourceCardIndex > 0 && !sourceCol[sourceCardIndex - 1].faceUp) {
                score += 40; // Even better if it reveals a card
              }
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
        }

        // Penalty for moving from discard to tableau if we haven't cycled through draw pile
        if (source === 'discard' && state.drawPile.length > 10) {
          score -= 20; // Prefer to see more cards first
        }

        // Check if this move might block future moves
        // Penalty for burying lower rank cards under higher rank cards of same color
        if (source === 'discard' && targetCol.length > 0) {
          const targetCard = targetCol[targetCol.length - 1];
          const cardValue = getRankValue(move.card.rank);
          const targetValue = getRankValue(targetCard.rank);
          
          // Check if we're potentially blocking
          if (cardValue > targetValue - 1 && isRed(move.card.suit) === isRed(targetCard.suit)) {
            score -= 15;
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

    // Sort by score (highest first)
    possibleMoves.sort((a, b) => b.score - a.score);

    // Check if we're in fast auto-complete mode (all tableau cards face up and no draw pile)
    const isAutoCompleteMode = state.drawPile.length === 0 && 
      state.tableau.every(col => col.every(card => card.faceUp));
    const moveDelay = isAutoCompleteMode ? 100 : 1000;
    const selectDelay = isAutoCompleteMode ? 50 : 200;

    // Execute the best move
    if (possibleMoves.length > 0) {
      const bestMove = possibleMoves[0];
      
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
        moveHistory: recordMove(currentState, move),
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
