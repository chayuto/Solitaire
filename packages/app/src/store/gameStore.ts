import { create } from 'zustand';
import type { GameState, GameEvent, GameEventType, Card, Suit, Difficulty } from '../types';
import { splitLegacyMoveHistory } from './migrations';
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
import { applyCommandToState } from './applyMove';
import { initialGameConfig } from './urlConfig';
import { DEFAULT_DIFFICULTY, TABLEAU_COLUMNS, AUTOPLAY_TIMING, AUTOPLAY_LOOP_DETECTION } from '../constants';
import { collectPossibleMoves, scoreMoves, filterLoopingMoves } from '../autoplay';
import {
  DEFAULT_AI_CONFIG,
  applyPreset,
  exportAIInteractions as serializeAIInteractions,
  uuidv7,
} from '../ai';
import { createAdvisorController } from '../ai/advisorController';
import type { AIConfig } from '../ai';
import { APP_BUILD_TIME, APP_COMMIT } from '../buildInfo';
import {
  resolveActiveSessionId,
  setActiveSessionId,
  wasCleanVisit,
} from './activeSession';
import {
  loadSession,
  saveSession,
  deleteSession,
  listSessions,
  type PersistedGameState,
  type SessionMeta,
} from './sessionPersistence';

/** Debounce window (ms) for autosaving the active game after a change. */
const SESSION_AUTOSAVE_DELAY = 500;

/** Build a telemetry {@link GameEvent} anchored at the current move index. */
const gameEvent = (state: GameState, type: GameEventType): GameEvent => ({
  type,
  timestamp: Date.now(),
  atMoveIndex: state.moveHistory.length,
});

/** Shared core engine instance — used for legal-move generation by the AI advisor. */
const engine = new GameEngine();

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
  /** Dismiss the win modal without starting a new game. */
  dismissWinModal: () => void;
  /** Restore a previously saved game by its session id. Returns success. */
  loadSavedSession: (sessionId: string) => boolean;
  /** Delete a saved game from storage. */
  deleteSavedSession: (sessionId: string) => void;
  /** Every saved game's metadata, most recently played first. */
  listSavedSessions: () => SessionMeta[];
  /** Open or close the saved-games manager modal. */
  setSessionManagerOpen: (open: boolean) => void;
}

/**
 * Initializes a new game state with the specified difficulty
 * Deals cards to tableau and sets up initial game conditions
 * @param difficulty - Game difficulty level (default: 3 = Normal)
 * @param seed - Optional RNG seed for a reproducible deal. Same seed => the
 *   exact same board every time — required for deterministic, high-fidelity
 *   automated/agentic testing. When omitted, a fresh random seed is generated
 *   so every game is still reproducible (and the Parallel Window can carry the
 *   exact board to a new session).
 * @returns Complete initial game state
 */
const initializeGameState = (
  difficulty: Difficulty = DEFAULT_DIFFICULTY,
  seed?: number,
): GameState => {
  // Every game gets a seed. An explicit one comes from the launch URL or a
  // loaded save; otherwise generate a random 32-bit seed so the deal is still
  // reproducible — without this, a normally-started game has no seed and the
  // Parallel Window opens a different board.
  const resolvedSeed = seed ?? Math.floor(Math.random() * 0x1_0000_0000);
  const deck = arrangeDeckByDifficulty(difficulty, resolvedSeed);
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
    eventLog: [],
    showValidMoves: true,
    godMode: false,
    autoPlayEnabled: false,
    autoPlayInProgress: false,
    autoPlayStateHistory: [],
    difficulty,
    seed: resolvedSeed,
    gameSessionId: uuidv7(),
    gameStartedAt: Date.now(),
    gameWon: false,
    winModalDismissed: false,
    initialBoardSetup,
    perceivedDifficulty: undefined, // Will be calculated below
    completionProgress: 0, // Start at 0% completion
    recycleCount: 0,
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
    sessionManagerOpen: false,
  };

  // Calculate perceived difficulty after initialState is created
  initialState.perceivedDifficulty = getPerceivedDifficulty(uiToCore(initialState));

  return initialState;
};

/**
 * Whether a persisted snapshot has the structural shape of a real game and is
 * safe to restore (seven tableau columns, the four foundations, card arrays).
 */
function isRestorable(p: PersistedGameState | null): p is PersistedGameState {
  return (
    p != null &&
    Array.isArray(p.tableau) &&
    p.tableau.length === 7 &&
    Array.isArray(p.drawPile) &&
    Array.isArray(p.discardPile) &&
    Array.isArray(p.moveHistory) &&
    p.foundations != null &&
    Array.isArray(p.foundations.hearts) &&
    Array.isArray(p.foundations.diamonds) &&
    Array.isArray(p.foundations.clubs) &&
    Array.isArray(p.foundations.spades)
  );
}

/**
 * Reconstitute a full {@link GameState} from a persisted snapshot. All
 * transient state — selection, in-flight AI, replay and auto-play progress —
 * is reset; only the game itself is restored.
 */
function hydratePersisted(p: PersistedGameState): GameState {
  // Saves written before the eventLog split carry autoplay telemetry embedded
  // in moveHistory — partition it out (no-op for current-format saves).
  const { moveHistory, eventLog } = splitLegacyMoveHistory(p.moveHistory, p.eventLog ?? []);
  return {
    drawPile: p.drawPile,
    discardPile: p.discardPile,
    foundations: p.foundations,
    tableau: p.tableau,
    selectedCard: undefined,
    moveHistory,
    eventLog,
    showValidMoves: p.showValidMoves,
    godMode: p.godMode,
    autoPlayEnabled: false,
    autoPlayInProgress: false,
    autoPlayStateHistory: [],
    difficulty: p.difficulty,
    seed: p.seed,
    gameSessionId: p.gameSessionId,
    gameStartedAt: p.gameStartedAt,
    gameWon: p.gameWon,
    winModalDismissed: p.winModalDismissed,
    initialBoardSetup: p.initialBoardSetup,
    perceivedDifficulty: p.perceivedDifficulty,
    completionProgress: p.completionProgress,
    recycleCount: p.recycleCount ?? 0,
    replayMode: false,
    replayIndex: 0,
    replayPaused: false,
    replaySpeed: p.replaySpeed ?? 1000,
    aiConfig: p.aiConfig ?? DEFAULT_AI_CONFIG,
    aiThinking: false,
    aiAutoPlay: false,
    aiThinkingSince: undefined,
    aiStatus: undefined,
    aiRetryCount: 0,
    aiError: undefined,
    aiDecisionLog: p.aiDecisionLog ?? [],
    aiKeyModalOpen: false,
    sessionManagerOpen: false,
  };
}

/**
 * Resolve the state the store starts with: a restored saved game when this tab
 * is anchored to one, otherwise a fresh deal. On a plain first visit with
 * saved games available, the saved-games picker is opened over the fresh deal.
 */
function buildInitialState(): GameState {
  const activeId = resolveActiveSessionId();
  if (activeId) {
    const persisted = loadSession(activeId);
    if (isRestorable(persisted)) {
      return hydratePersisted(persisted);
    }
  }

  const fresh = initializeGameState(
    initialGameConfig.difficulty,
    initialGameConfig.seed,
  );
  if (wasCleanVisit() && listSessions().length > 0) {
    fresh.sessionManagerOpen = true;
  }
  return fresh;
}



export const useGameStore = create<GameStore>((set, get) => {
  // The AI advisor orchestration lives in ai/advisorController; it receives
  // store access by injection so ai/ never imports the store (ADR boundary).
  const advisor = createAdvisorController({ get, set, engine });

  return {
  ...buildInitialState(),
  initializeGame: (difficulty?: Difficulty, seed?: number) => {
    const currentDifficulty = difficulty ?? get().difficulty ?? 3;
    // A new game invalidates the in-flight AI request and all per-run
    // advisor tracking (plateau, window, outcome, position history, cap).
    advisor.resetRunState();
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

    // Build the command and let the core engine apply it (ADR-0005); the
    // store keeps selection UX. Records/derived state come from applyMove.
    const command: MoveCommand =
      selected.source === 'tableau' &&
      selected.columnIndex !== undefined &&
      selected.cardIndex !== undefined
        ? {
            type: 'tableau_to_tableau',
            from: { column: selected.columnIndex, cardIndex: selected.cardIndex },
            to: { column: targetColumn },
          }
        : { type: 'discard_to_tableau', to: { column: targetColumn } };

    const applied = applyCommandToState(state, command, engine);
    if (!applied) return;
    set({ ...applied.partial, selectedCard: undefined });
  },

  moveCardToFoundation: (suit) => {
    const state = get();
    const selected = state.selectedCard;

    if (!selected) return;

    // Check if move is valid
    if (!get().canMoveToFoundation(selected.card, suit)) {
      return;
    }

    let command: MoveCommand;
    if (selected.source === 'tableau' && selected.columnIndex !== undefined && selected.cardIndex !== undefined) {
      // Only the top card of a column can move to a foundation.
      const sourceColumn = state.tableau[selected.columnIndex];
      if (selected.cardIndex !== sourceColumn.length - 1) {
        return;
      }
      command = {
        type: 'tableau_to_foundation',
        from: { column: selected.columnIndex, cardIndex: selected.cardIndex },
        to: { suit },
      };
    } else if (selected.source === 'discard') {
      command = { type: 'discard_to_foundation', to: { suit } };
    } else {
      return;
    }

    const applied = applyCommandToState(state, command, engine);
    if (!applied) return;
    set({ ...applied.partial, selectedCard: undefined });

    // Check for win condition
    const newState = get();
    if (isGameWon(newState)) {
      set({ gameWon: true, autoPlayEnabled: false, autoPlayInProgress: false });
    } else {
      // Check if auto-complete should be triggered
      get().checkAndTriggerAutoComplete();
    }
  },

  drawCard: () => {
    const state = get();

    // Empty stock recycles the waste (one fused user action); an empty stock
    // AND empty waste is a no-op — there is nothing to draw or recycle.
    if (state.drawPile.length === 0 && state.discardPile.length === 0) {
      return;
    }
    const command: MoveCommand =
      state.drawPile.length === 0 ? { type: 'recycle_stock' } : { type: 'draw_card' };

    const applied = applyCommandToState(state, command, engine);
    if (!applied) return;
    set(applied.partial);
  },

  exportGameState: () => {
    const state = get();
    const exportState: GameState = {
      drawPile: state.drawPile,
      discardPile: state.discardPile,
      foundations: state.foundations,
      tableau: state.tableau,
      moveHistory: state.moveHistory,
      eventLog: state.eventLog,
      showValidMoves: state.showValidMoves,
      godMode: state.godMode,
      autoPlayEnabled: state.autoPlayEnabled,
      autoPlayInProgress: state.autoPlayInProgress,
      difficulty: state.difficulty,
      // Session id, deal seed and AI config travel with the save so an
      // exported game is identifiable, repeatable (re-deal the same board) and
      // self-describing (which model and settings played it).
      gameSessionId: state.gameSessionId,
      gameStartedAt: state.gameStartedAt,
      seed: state.seed,
      aiConfig: state.aiConfig,
      gameWon: state.gameWon,
      initialBoardSetup: state.initialBoardSetup,
      perceivedDifficulty: state.perceivedDifficulty,
      completionProgress: state.completionProgress,
      recycleCount: state.recycleCount,
      replayMode: state.replayMode,
      replayIndex: state.replayIndex,
      replayPaused: state.replayPaused,
      replaySpeed: state.replaySpeed,
      // The AI decision log travels with the save so an exported game is a
      // complete record of how the AI played, for replay and benchmarking.
      aiDecisionLog: state.aiDecisionLog,
    };
    // Stamp the build commit so an exported game traces back to its code
    // revision (the GameState fields are unchanged for import compatibility).
    return JSON.stringify(
      { ...exportState, appCommit: APP_COMMIT, appBuildTime: APP_BUILD_TIME },
      null,
      2,
    );
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

      // Exports written before the eventLog split embed autoplay telemetry in
      // moveHistory — partition it out (no-op for current-format exports).
      const { moveHistory, eventLog } = splitLegacyMoveHistory(
        importedState.moveHistory,
        importedState.eventLog ?? [],
      );

      // Set the imported state
      // Note: gameWon is set to false to allow replay functionality for won games
      set({
        drawPile: importedState.drawPile,
        discardPile: importedState.discardPile,
        foundations: importedState.foundations,
        tableau: importedState.tableau,
        selectedCard: undefined,
        moveHistory,
        eventLog,
        showValidMoves: importedState.showValidMoves,
        godMode: importedState.godMode,
        autoPlayEnabled: importedState.autoPlayEnabled,
        autoPlayInProgress: false,
        difficulty: importedState.difficulty,
        seed: importedState.seed,
        // Keep the imported session identity; older saves get a fresh one.
        gameSessionId: importedState.gameSessionId ?? uuidv7(),
        gameStartedAt: importedState.gameStartedAt,
        aiConfig: importedState.aiConfig ?? get().aiConfig ?? DEFAULT_AI_CONFIG,
        gameWon: false, // Always set to false to allow replay even for won games
        initialBoardSetup: importedState.initialBoardSetup,
        perceivedDifficulty,
        completionProgress,
        recycleCount: importedState.recycleCount ?? 0,
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
      // Heuristic auto-play must never run while the AI is driving the game.
      // An AI session has to stay pure AI — no human or heuristic intervention —
      // or harvested games are contaminated with non-AI moves.
      if (state.aiThinking || state.aiAutoPlay) {
        set({ aiError: 'Stop AI play before starting auto-play.' });
        return;
      }
      // Log auto-play start event
      set({
        autoPlayEnabled: newAutoPlayEnabled,
        autoPlayStateHistory: [],
        eventLog: [...(state.eventLog ?? []), gameEvent(state, 'autoplay_start')],
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
      set({
        autoPlayEnabled: newAutoPlayEnabled,
        autoPlayStateHistory: [],
        eventLog: [...(state.eventLog ?? []), gameEvent(state, 'autoplay_stop')],
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
      set({
        autoPlayEnabled: false,
        autoPlayInProgress: false,
        autoPlayStateHistory: [],
        eventLog: [...(state.eventLog ?? []), gameEvent(state, 'autoplay_loop_detected')],
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
      set({
        autoPlayEnabled: false,
        autoPlayInProgress: false,
        autoPlayStateHistory: [],
        eventLog: [...(state.eventLog ?? []), gameEvent(state, 'autoplay_loop_detected')],
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
      set({
        autoPlayEnabled: false,
        autoPlayInProgress: false,
        autoPlayStateHistory: [],
        eventLog: [...(currentState.eventLog ?? []), gameEvent(currentState, 'autoplay_deadend')],
      });
      return;
    }

    // No moves available - stop auto-play (shouldn't reach here, but safety net)
    set({ autoPlayEnabled: false, autoPlayInProgress: false, autoPlayStateHistory: [] });
  },

  checkAndTriggerAutoComplete: () => {
    const state = get();

    // Don't trigger if already won, if auto-play is already active, or if the
    // AI is driving the game. During AI play (a single Ask AI request or AI
    // auto-play) the AI owns every move — the heuristic auto-complete must not
    // hijack it, or AI auto-play stalls and end-game moves go unlogged.
    if (state.gameWon || state.autoPlayEnabled || state.aiThinking || state.aiAutoPlay) {
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
      recycleCount: 0,
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
            // Reset draw pile from discard pile; track cycle the same way
            // live play does.
            newState.drawPile = [...newState.discardPile].reverse().map(card => ({
              ...card,
              faceUp: false,
            }));
            newState.discardPile = [];
            newState.recycleCount = (newState.recycleCount ?? 0) + 1;
          }
          break;
        }

        case 'recycle_stock': {
          // Explicit recycle: reset the stock from the waste, matching live
          // play. Older histories (no recycle_stock entry) still recycle via
          // the draw_card branch above; new histories recycle here, then the
          // following draw_card sees a full stock and just draws.
          if (newState.discardPile && newState.discardPile.length > 0) {
            newState.drawPile = [...newState.discardPile].reverse().map(card => ({
              ...card,
              faceUp: false,
            }));
            newState.discardPile = [];
            newState.recycleCount = (newState.recycleCount ?? 0) + 1;
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
    // Apply a core MoveCommand through the same engine pathway as a human
    // move, so an AI/auto-play move is recorded, flips cards, updates
    // progress and triggers auto-complete exactly like manual play.
    switch (command.type) {
      case 'draw_card':
      case 'recycle_stock':
        // The store's drawCard recycles the waste when the stock is empty.
        get().drawCard();
        return;
      case 'flip_card':
        // Flips are produced automatically by other moves; nothing to do.
        return;
      default: {
        const applied = applyCommandToState(get(), command, engine);
        if (!applied) return;
        set({ ...applied.partial, selectedCard: undefined });

        if (command.type === 'tableau_to_foundation' || command.type === 'discard_to_foundation') {
          const newState = get();
          if (isGameWon(newState)) {
            set({ gameWon: true, autoPlayEnabled: false, autoPlayInProgress: false });
          } else {
            get().checkAndTriggerAutoComplete();
          }
        }
      }
    }
  },

  askAIForMove: () => advisor.askForMove(),

  toggleAIAutoPlay: () => advisor.toggleAutoPlay(),

  continueAIAutoPlay: () => advisor.continueAutoPlay(),

  cancelAIRequest: () => advisor.cancel(),

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

  exportAIInteractions: () => {
    // Stamp the export with the current game's outcome so a harvested dataset
    // can be filtered for quality games (e.g. wins only) on its own.
    // `stalled_auto_terminated` is preferred over `incomplete` so the
    // analytics side can tell a machine-terminated doom-loop apart from a
    // genuinely abandoned game.
    const state = get();
    const outcome: 'won' | 'lost' | 'stalled_auto_terminated' | 'incomplete' =
      state.gameWon
        ? 'won'
        : engine.getLegalMoves(uiToCore(state)).length === 0
          ? 'lost'
          : advisor.wasStalled()
            ? 'stalled_auto_terminated'
            : 'incomplete';
    return serializeAIInteractions(
      {
        sessionId: state.gameSessionId ?? '',
        seed: state.seed,
        model: (state.aiConfig ?? DEFAULT_AI_CONFIG).model,
        outcome,
        finalProgress: Math.round(state.completionProgress),
        moveCount: state.moveHistory.length,
      },
      // Embed the turn-0 deal so the ai-log alone can reconstruct the board —
      // the only way we recover the deck for plain losses, which emit no
      // win/game file.
      state.initialBoardSetup,
    );
  },

  dismissWinModal: () => {
    set({ winModalDismissed: true });
  },

  loadSavedSession: (sessionId: string) => {
    const persisted = loadSession(sessionId);
    if (!isRestorable(persisted)) return false;
    // Restoring a game invalidates the in-flight AI request and per-run state.
    advisor.resetRunState();
    set({ ...hydratePersisted(persisted), sessionManagerOpen: false });
    return true;
  },

  deleteSavedSession: (sessionId: string) => {
    deleteSession(sessionId);
  },

  listSavedSessions: () => listSessions(),

  setSessionManagerOpen: (open: boolean) => {
    set({ sessionManagerOpen: open });
  },
  };
});

// ---------------------------------------------------------------------------
// Session persistence: anchor the tab to its game, and autosave on change.
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  const firstId = useGameStore.getState().gameSessionId;
  if (firstId) setActiveSessionId(firstId);
  // Persist the starting game so even an immediate reload restores it. (An
  // untouched, move-free deal is skipped by saveSession — nothing to lose.)
  saveSession(useGameStore.getState());

  let anchoredId = firstId;
  let lastSignature = '';
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  useGameStore.subscribe((state) => {
    // Re-anchor the tab whenever the game identity changes — a New Game, or
    // resuming a save — so a reload restores the game now on screen.
    if (state.gameSessionId && state.gameSessionId !== anchoredId) {
      anchoredId = state.gameSessionId;
      setActiveSessionId(state.gameSessionId);
    }

    // Debounced autosave, skipped when nothing persisted actually changed
    // (e.g. an AI "thinking" flag toggling does not touch the saved game).
    const signature =
      `${state.gameSessionId}|${state.moveHistory.length}|${state.gameWon}` +
      `|${Math.round(state.completionProgress)}|${state.godMode}` +
      `|${state.showValidMoves}|${state.replaySpeed}` +
      `|${state.winModalDismissed}|${state.aiDecisionLog?.length ?? 0}` +
      `|${state.eventLog?.length ?? 0}`;
    if (signature === lastSignature) return;
    lastSignature = signature;

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveSession(useGameStore.getState());
    }, SESSION_AUTOSAVE_DELAY);
  });
}
