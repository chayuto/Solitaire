import { create } from 'zustand';
import type { GameState, Card, Suit, Move, Difficulty } from '../types';
import {
  arrangeDeckByDifficulty,
  canMoveToTableau as canMoveToTableauCore,
  canMoveToFoundation as canMoveToFoundationCore,
  hasValidFoundationDestination as hasValidFoundationDestinationCore,
  hashGameState,
  getPerceivedDifficulty,
  getCompletionProgress,
  getValidTableauDestinations,
  GameEngine,
} from '@chayuto/solitaire-core';
import type { MoveCommand } from '@chayuto/solitaire-core';
import {
  hasAnyValidDestination as hasAnyValidDestinationHelper,
  hasAnyValidMoves,
  isGameWon,
  canAutoComplete,
} from './uiHelpers';
import { uiToCore } from '../adapters/coreAdapter';
import { initialGameConfig } from './urlConfig';
import { DEFAULT_DIFFICULTY, TABLEAU_COLUMNS, AUTOPLAY_TIMING, AUTOPLAY_LOOP_DETECTION } from '../constants';
import { collectPossibleMoves, scoreMoves, filterLoopingMoves } from '../autoplay';
import {
  AIError,
  AI_DECISION_LOG_LIMIT,
  AI_AUTO_MOVE_DELAY,
  AI_AUTO_HISTORY_LIMIT,
  AI_AUTO_RETRY_COOLDOWN,
  AI_RETRY_MAX_ATTEMPTS,
  DEFAULT_AI_CONFIG,
  applyPreset,
  buildContext,
  buildSystemInstruction,
  describeMoveCommand,
  exportAIInteractions as serializeAIInteractions,
  getEffectiveKey,
  getLastAIInteraction,
  getProvider,
  isTransientAIError,
  suggestMoveWithRetry,
  uuidv7,
} from '../ai';
import type { AIConfig, AIDecisionRecord } from '../ai';

/** Shared core engine instance — used for legal-move generation by the AI advisor. */
const engine = new GameEngine();

/**
 * Abort controller for the in-flight AI request, kept at module scope because
 * an `AbortController` is not serializable into Zustand state.
 */
let aiAbortController: AbortController | null = null;

/**
 * Board-state hashes seen during the current AI auto-play run, for loop
 * detection. Reset each time AI auto-play is engaged.
 */
let aiAutoStateHistory: string[] = [];

/** Keys in {@link AIConfig} that a context preset controls. */
const AI_TOGGLE_KEYS: readonly (keyof AIConfig)[] = [
  'includeMoveHistory',
  'moveHistoryLimit',
  'includeGameMetrics',
  'includeStrategyGuidance',
  'includeHeuristicScores',
  'includeSeenDrawPileCards',
  'includeReasoningTrail',
  'reasoningTrailLimit',
];

/**
 * GameStore interface extending GameState with action methods
 * Manages all game logic and state mutations for Solitaire
 */
interface GameStore extends GameState {
  initializeGame: (difficulty?: Difficulty, seed?: number) => void;
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
  // --- AI Move Advisor ---
  /** Apply a core {@link MoveCommand} through the normal move pathway. */
  applyMoveCommand: (command: MoveCommand) => void;
  /** Ask the configured LLM for the next best move and apply it. */
  askAIForMove: () => Promise<void>;
  /** Toggle AI auto-play: the LLM keeps playing move-by-move until the game
   *  ends, a loop is detected, an error occurs, or the user stops it. */
  toggleAIAutoPlay: () => void;
  /** Internal: schedule the next AI auto-play move (with loop detection). */
  continueAIAutoPlay: () => void;
  /** Cancel an in-flight AI request. */
  cancelAIRequest: () => void;
  /** Update the AI advisor configuration (partial patch). */
  setAIConfig: (patch: Partial<AIConfig>) => void;
  /** Clear the last AI advisor error message. */
  clearAIError: () => void;
  /** Open or close the API key modal. */
  setAIKeyModalOpen: (open: boolean) => void;
  /** Serialize the full LLM interaction log to a JSON string for export. */
  exportAIInteractions: () => string;
}

/**
 * Initializes a new game state with the specified difficulty
 * Deals cards to tableau and sets up initial game conditions
 * @param difficulty - Game difficulty level (default: 3 = Normal)
 * @param seed - Optional RNG seed for a reproducible deal. Same seed => the
 *   exact same board every time — required for deterministic, high-fidelity
 *   automated/agentic testing. When omitted, the deal is random.
 * @returns Complete initial game state
 */
const initializeGameState = (
  difficulty: Difficulty = DEFAULT_DIFFICULTY,
  seed?: number,
): GameState => {
  const deck = arrangeDeckByDifficulty(difficulty, seed);
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
    seed,
    gameWon: false,
    initialBoardSetup,
    perceivedDifficulty: undefined, // Will be calculated below
    completionProgress: 0, // Start at 0% completion
    replayMode: false,
    replayIndex: 0,
    replayPaused: false,
    replaySpeed: 1000, // 1 second per move
    aiConfig: DEFAULT_AI_CONFIG,
    aiThinking: false,
    aiAutoPlay: false,
    aiThinkingSince: undefined,
    aiStatus: undefined,
    aiRetryCount: 0,
    aiError: undefined,
    aiDecisionLog: [],
    aiKeyModalOpen: false,
  };

  // Calculate perceived difficulty after initialState is created
  initialState.perceivedDifficulty = getPerceivedDifficulty(uiToCore(initialState));

  return initialState;
};



export const useGameStore = create<GameStore>((set, get) => ({
  ...initializeGameState(initialGameConfig.difficulty, initialGameConfig.seed),
  initializeGame: (difficulty?: Difficulty, seed?: number) => {
    const currentDifficulty = difficulty ?? get().difficulty ?? 3;
    // A new game invalidates any in-flight AI request.
    aiAbortController?.abort();
    aiAbortController = null;
    // The AI config is a session-level preference — preserve it across games.
    const preservedConfig = get().aiConfig ?? DEFAULT_AI_CONFIG;
    set({ ...initializeGameState(currentDifficulty, seed), aiConfig: preservedConfig });
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
      // Deal seed and AI config travel with the save so an exported game is
      // repeatable (re-deal the same board) and self-describing (which model
      // and settings played it).
      seed: state.seed,
      aiConfig: state.aiConfig,
      gameWon: state.gameWon,
      initialBoardSetup: state.initialBoardSetup,
      perceivedDifficulty: state.perceivedDifficulty,
      completionProgress: state.completionProgress,
      replayMode: state.replayMode,
      replayIndex: state.replayIndex,
      replayPaused: state.replayPaused,
      replaySpeed: state.replaySpeed,
      // The AI decision log travels with the save so an exported game is a
      // complete record of how the AI played, for replay and benchmarking.
      aiDecisionLog: state.aiDecisionLog,
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
        seed: importedState.seed,
        aiConfig: importedState.aiConfig ?? get().aiConfig ?? DEFAULT_AI_CONFIG,
        gameWon: false, // Always set to false to allow replay even for won games
        initialBoardSetup: importedState.initialBoardSetup,
        perceivedDifficulty,
        completionProgress,
        replayMode: false,
        replayIndex: 0,
        replayPaused: false,
        replaySpeed: importedState.replaySpeed ?? 1000,
        // Restore the AI decision log if the save carries one (older saves
        // and non-AI games simply have none).
        aiDecisionLog: importedState.aiDecisionLog ?? [],
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
        }, AUTOPLAY_TIMING.START_DELAY);
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
    
    // Add current state to history BEFORE executing move
    const updatedStateHistory = [...stateHistory, currentStateHash].slice(-AUTOPLAY_LOOP_DETECTION.MAX_STATE_HISTORY);
    set({ autoPlayStateHistory: updatedStateHistory });

    // Collect and score all possible moves using the autoplay module
    const possibleMoves = collectPossibleMoves(
      state,
      (card, targetColumn) => get().canMoveToTableau(card, targetColumn),
      (card, suit) => get().canMoveToFoundation(card, suit)
    );
    
    // Score all moves
    const allScoredMoves = scoreMoves(possibleMoves, state);

    // Detect fast auto-complete mode (draw pile empty, every tableau card face up).
    // In this endgame state the columns are sorted runs and the only productive
    // move is sending cards to the foundations. Tableau-to-tableau moves merely
    // shuffle sorted stacks around (and can loop forever), so when any foundation
    // move exists we restrict selection to foundation moves only.
    const isAutoCompleteMode = state.drawPile.length === 0 &&
      state.tableau.every(col => col.every(card => card.faceUp));
    const foundationMoves = allScoredMoves.filter(m => m.targetType === 'foundation');
    const restrictToFoundations = isAutoCompleteMode && foundationMoves.length > 0;
    const scoredMoves = restrictToFoundations ? foundationMoves : allScoredMoves;

    // Filter out moves that would result in loop states
    const nonLoopingMoves = filterLoopingMoves(scoredMoves, state, updatedStateHistory);

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
    
    // Filter out moves with negative scores (useless moves). When restricted to
    // foundation moves every move is necessary endgame progress, so keep them
    // all even if a tableau-building heuristic scored one negative.
    const worthwhileMoves = restrictToFoundations
      ? nonLoopingMoves
      : nonLoopingMoves.filter(move => move.score > 0);

    const moveDelay = isAutoCompleteMode ? AUTOPLAY_TIMING.FAST_MOVE_DELAY : AUTOPLAY_TIMING.NORMAL_MOVE_DELAY;
    const selectDelay = isAutoCompleteMode ? AUTOPLAY_TIMING.SELECT_DELAY_FAST : AUTOPLAY_TIMING.SELECT_DELAY_NORMAL;

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
      // Enable auto-play with fast mode
      set({ autoPlayEnabled: true, autoPlayStateHistory: [] });
      
      // Start the first move after a short delay
      setTimeout(() => {
        if (get().autoPlayEnabled) {
          get().performAutoPlayMove();
        }
      }, AUTOPLAY_TIMING.AUTO_COMPLETE_START_DELAY);
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

  // -------------------------------------------------------------------------
  // AI Move Advisor
  // -------------------------------------------------------------------------

  applyMoveCommand: (command: MoveCommand) => {
    // Translates a core MoveCommand into the store's existing move actions, so
    // an AI-chosen move is recorded, flips cards, updates progress and triggers
    // auto-complete exactly like a human move.
    switch (command.type) {
      case 'draw_card':
      case 'recycle_stock':
        // The store's drawCard recycles the waste when the stock is empty.
        get().drawCard();
        break;
      case 'tableau_to_tableau':
        if (command.from?.column === undefined || command.to?.column === undefined) return;
        get().selectCard('tableau', command.from.column, command.from.cardIndex);
        get().moveCardToTableau(command.to.column);
        break;
      case 'tableau_to_foundation':
        if (command.from?.column === undefined || !command.to?.suit) return;
        get().selectCard('tableau', command.from.column, command.from.cardIndex);
        get().moveCardToFoundation(command.to.suit);
        break;
      case 'discard_to_tableau':
        if (command.to?.column === undefined) return;
        get().selectCard('discard');
        get().moveCardToTableau(command.to.column);
        break;
      case 'discard_to_foundation':
        if (!command.to?.suit) return;
        get().selectCard('discard');
        get().moveCardToFoundation(command.to.suit);
        break;
      case 'flip_card':
        // Flips are produced automatically by other moves; nothing to do.
        break;
    }
  },

  askAIForMove: async () => {
    const state = get();

    // --- Guards ---
    if (state.aiThinking) {
      return; // a request is already in flight
    }
    if (state.gameWon) {
      set({ aiError: 'The game is already won.', aiAutoPlay: false });
      return;
    }
    if (state.replayMode) {
      set({ aiError: 'Cannot ask the AI while in replay mode.', aiAutoPlay: false });
      return;
    }
    if (state.autoPlayEnabled) {
      set({ aiError: 'Cannot ask the AI while auto-play is running.', aiAutoPlay: false });
      return;
    }

    const config = state.aiConfig ?? DEFAULT_AI_CONFIG;

    // Resolve the provider.
    let provider;
    try {
      provider = getProvider(config.provider);
    } catch (err) {
      set({
        aiError: err instanceof AIError ? err.message : 'AI provider configuration error.',
        aiAutoPlay: false,
      });
      return;
    }

    // Resolve the API key. No key => prompt for one instead of erroring.
    const apiKey = provider.requiresKey ? getEffectiveKey(config.provider) : '';
    if (provider.requiresKey && !apiKey) {
      set({ aiError: undefined, aiKeyModalOpen: true, aiAutoPlay: false });
      return;
    }

    // Generate the legal moves the AI must choose from.
    const coreState = uiToCore(state);
    const legalMoves = engine.getLegalMoves(coreState);
    if (legalMoves.length === 0) {
      set({
        aiError: 'No legal moves are available — try drawing or starting a new game.',
        aiAutoPlay: false,
      });
      return;
    }

    const context = buildContext(state, legalMoves, config, state.aiDecisionLog ?? []);
    const systemInstruction = buildSystemInstruction(config);

    // --- Begin the request ---
    aiAbortController = new AbortController();
    const requestStartedAt = Date.now();
    // UUIDv7 idempotency id for this logical request; retries reuse it and
    // every interaction is logged under it.
    const requestId = uuidv7();
    set({
      aiThinking: true,
      aiThinkingSince: requestStartedAt,
      aiStatus: undefined,
      aiRetryCount: 0,
      aiError: undefined,
    });

    try {
      // Retry transient failures (flaky network, rate limits, 5xx responses,
      // the occasional unparseable answer) with exponential backoff.
      const decision = await suggestMoveWithRetry(
        provider,
        {
          apiKey: apiKey ?? '',
          model: config.model,
          systemInstruction,
          context,
          signal: aiAbortController.signal,
          requestId,
        },
        {
          maxAttempts: AI_RETRY_MAX_ATTEMPTS,
          signal: aiAbortController.signal,
          onRetry: ({ attempt, maxAttempts, error, delayMs }) => {
            set({
              aiRetryCount: attempt,
              aiStatus:
                `${error.message} Retrying ${attempt + 1}/${maxAttempts} ` +
                `in ${Math.round(delayMs / 1000)}s.`,
            });
          },
        },
      );

      // Defensive: the provider already range-checked moveIndex, but never
      // index a move list with an unverified value.
      if (decision.moveIndex < 0 || decision.moveIndex >= legalMoves.length) {
        throw new AIError('bad_response', 'AI chose a move outside the legal set.');
      }
      const command = legalMoves[decision.moveIndex];

      // Re-validate against the *current* state before applying. The board is
      // locked while aiThinking, so this should always pass.
      if (!engine.canApplyMove(uiToCore(get()), command)) {
        throw new AIError('bad_response', 'The chosen move is no longer valid.');
      }

      // Apply the move, then annotate the new move-history entry with the
      // AI's reasoning so the Activity Log can surface it.
      const beforeLen = get().moveHistory.length;
      get().applyMoveCommand(command);
      const afterMoves = get().moveHistory;
      if (afterMoves.length > beforeLen) {
        const annotated = [...afterMoves];
        annotated[beforeLen] = {
          ...annotated[beforeLen],
          aiReasoning: decision.reasoning,
          aiConfidence: decision.confidence,
        };
        set({ moveHistory: annotated });
      }

      // Record the decision. This drives the advisor panel and the reasoning
      // trail, is exported with the game, and carries enough cost/choice
      // detail to serve as a benchmarking dataset row.
      const interaction = getLastAIInteraction();
      const record: AIDecisionRecord = {
        timestamp: Date.now(),
        moveType: command.type,
        describe: describeMoveCommand(command, state),
        boardAnalysis: decision.boardAnalysis,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        alternativeDescribe:
          decision.alternativeMoveIndex !== undefined
            ? describeMoveCommand(legalMoves[decision.alternativeMoveIndex], state)
            : undefined,
        model: config.model,
        requestId,
        moveIndex: decision.moveIndex,
        legalMoveCount: legalMoves.length,
        durationMs: Date.now() - requestStartedAt,
        retries: get().aiRetryCount ?? 0,
        promptTokens: interaction?.promptTokens,
        thoughtTokens: interaction?.thoughtTokens,
        outputTokens: interaction?.outputTokens,
        totalTokens: interaction?.totalTokens,
      };
      const aiDecisionLog = [...(get().aiDecisionLog ?? []), record].slice(
        -AI_DECISION_LOG_LIMIT,
      );
      set({
        aiThinking: false,
        aiThinkingSince: undefined,
        aiStatus: undefined,
        aiDecisionLog,
        aiError: undefined,
      });

      // Diagnostic: total time for this move, including any retries.
      const retries = get().aiRetryCount ?? 0;
      console.info(
        `[AI] move applied in ${((Date.now() - requestStartedAt) / 1000).toFixed(1)}s` +
          (retries > 0 ? ` after ${retries} retr${retries === 1 ? 'y' : 'ies'}` : ''),
      );

      // If AI auto-play is engaged, queue the next move.
      if (get().aiAutoPlay) {
        get().continueAIAutoPlay();
      }
    } catch (err) {
      // A user-initiated cancel is not an error worth surfacing.
      if (err instanceof AIError && err.kind === 'aborted') {
        set({
          aiThinking: false,
          aiThinkingSince: undefined,
          aiStatus: undefined,
          aiError: undefined,
        });
        return;
      }
      const message =
        err instanceof AIError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unexpected AI error.';

      // In auto-play, a transient (infrastructure) failure must not stop the
      // run. The retries above are already exhausted, so cool down and
      // re-attempt the move. LLM endpoints are not always stable.
      if (get().aiAutoPlay && isTransientAIError(err)) {
        set({
          aiThinking: false,
          aiThinkingSince: undefined,
          aiStatus: undefined,
          aiError: `${message} Auto-play retries in ${Math.round(AI_AUTO_RETRY_COOLDOWN / 1000)}s.`,
        });
        setTimeout(() => {
          if (get().aiAutoPlay && !get().aiThinking) {
            void get().askAIForMove();
          }
        }, AI_AUTO_RETRY_COOLDOWN);
        return;
      }

      // Otherwise stop: a non-transient error, or a manual single request.
      set({
        aiThinking: false,
        aiThinkingSince: undefined,
        aiStatus: undefined,
        aiError: message,
        aiAutoPlay: false,
      });
    } finally {
      aiAbortController = null;
    }
  },

  toggleAIAutoPlay: () => {
    const state = get();
    if (state.aiAutoPlay) {
      // Stop: abort any in-flight request so it halts immediately.
      aiAbortController?.abort();
      set({ aiAutoPlay: false });
      return;
    }
    // Start.
    if (state.gameWon) {
      set({ aiError: 'The game is already won.' });
      return;
    }
    if (state.replayMode || state.autoPlayEnabled) {
      set({ aiError: 'Stop replay / auto-play before starting AI auto-play.' });
      return;
    }
    aiAutoStateHistory = [];
    set({ aiAutoPlay: true, aiError: undefined });
    void get().askAIForMove();
  },

  continueAIAutoPlay: () => {
    const state = get();
    if (!state.aiAutoPlay) return;

    // Stop cleanly when the game is won.
    if (state.gameWon) {
      set({ aiAutoPlay: false });
      return;
    }

    // Loop detection: if the board returns to a previously seen position the
    // AI is cycling — stop rather than burn API calls forever.
    const hash = hashGameState(uiToCore(state));
    if (aiAutoStateHistory.includes(hash)) {
      set({
        aiAutoPlay: false,
        aiError: 'AI auto-play stopped: the board returned to an earlier position (loop).',
      });
      return;
    }
    aiAutoStateHistory = [...aiAutoStateHistory, hash].slice(-AI_AUTO_HISTORY_LIMIT);

    setTimeout(() => {
      if (get().aiAutoPlay && !get().aiThinking) {
        void get().askAIForMove();
      }
    }, AI_AUTO_MOVE_DELAY);
  },

  cancelAIRequest: () => {
    aiAbortController?.abort();
    // Clear the thinking state immediately for responsive UI; the in-flight
    // promise's catch handler will also run and is a no-op for 'aborted'.
    set({ aiThinking: false, aiThinkingSince: undefined });
  },

  setAIConfig: (patch: Partial<AIConfig>) => {
    const current = get().aiConfig ?? DEFAULT_AI_CONFIG;
    let next: AIConfig = { ...current, ...patch };

    if (patch.preset !== undefined && patch.preset !== 'custom') {
      // Switching to a named preset applies its whole toggle bundle.
      next = applyPreset(next, patch.preset);
    } else if (patch.preset === undefined && AI_TOGGLE_KEYS.some((k) => k in patch)) {
      // Changing an individual toggle moves the config into 'custom' mode.
      next.preset = 'custom';
    }

    set({ aiConfig: next });
  },

  clearAIError: () => {
    set({ aiError: undefined });
  },

  setAIKeyModalOpen: (open: boolean) => {
    set({ aiKeyModalOpen: open });
  },

  exportAIInteractions: () => serializeAIInteractions(),
}));
