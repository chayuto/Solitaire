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
  shuffle,
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
  AIError,
  AI_DECISION_LOG_LIMIT,
  AI_AUTO_MOVE_DELAY,
  AI_AUTO_HISTORY_LIMIT,
  AI_AUTO_LOOP_LIMIT,
  AI_AUTO_STALL_SHUFFLE_FRACTION,
  AI_AUTO_TURN_CAP,
  AI_AUTO_TURN_CAP_RESUME_INCREMENT,
  AI_AUTO_RETRY_COOLDOWN,
  AI_RETRY_MAX_ATTEMPTS,
  DEFAULT_AI_CONFIG,
  applyPreset,
  buildContext,
  buildSystemInstruction,
  computeProgressComponents,
  describeMoveCommand,
  exportAIInteractions as serializeAIInteractions,
  getEffectiveKey,
  getLastAIInteraction,
  getProvider,
  isTransientAIError,
  recordAIInteraction,
  setLastInteractionMovesApplied,
  shouldTerminateOnStall,
  shuffleFraction,
  suggestMoveWithRetry,
  uuidv7,
} from '../ai';
import type { AIConfig, AIDecisionRecord } from '../ai';
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

/**
 * Progress components ({foundationCards, faceDownTotal}) at the previous AI
 * auto-play turn, and how many consecutive turns since either changed. Drives
 * stall detection. Reset each time AI auto-play is engaged.
 */
let aiAutoLastProgress: { f: number; d: number } | null = null;
let aiAutoStallCount = 0;

/**
 * Move types applied on each consecutive flat-progress turn — the rolling
 * window the shuffle-fraction gate reads to decide whether a long plateau is
 * a real doom-loop (shuffle-dominated) or an honest hunt (draw-dominated).
 * Cleared whenever progress is made or auto-play is re-engaged.
 */
let aiAutoRecentMoveTypes: string[] = [];

/**
 * Whether the current game's auto-play was halted by the stall terminator. The
 * store reads this at export time so a harvested record carries
 * `outcome: 'stalled_auto_terminated'` rather than the catch-all `incomplete`.
 * Reset on a new game or re-engaged auto-play.
 */
let aiAutoStalled = false;

/**
 * Move-count at which the current AI auto-play run pauses for a manual resume —
 * the token-runaway cap. Set when auto-play is engaged (first run: the
 * {@link AI_AUTO_TURN_CAP} boundary; a resume past that: the current move-count
 * plus {@link AI_AUTO_TURN_CAP_RESUME_INCREMENT}). Read once per turn in
 * {@link continueAIAutoPlay}.
 */
let aiAutoTurnCap = AI_AUTO_TURN_CAP;

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



export const useGameStore = create<GameStore>((set, get) => ({
  ...buildInitialState(),
  initializeGame: (difficulty?: Difficulty, seed?: number) => {
    const currentDifficulty = difficulty ?? get().difficulty ?? 3;
    // A new game invalidates any in-flight AI request.
    aiAbortController?.abort();
    aiAbortController = null;
    // Auto-play tracking belongs to the previous game; clear it so the new
    // game starts with a fresh plateau / window / outcome / position history.
    aiAutoStateHistory = [];
    aiAutoLastProgress = null;
    aiAutoStallCount = 0;
    aiAutoRecentMoveTypes = [];
    aiAutoStalled = false;
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

    // Generate the legal moves the AI must choose from. Shuffle them so the
    // draw move is not always at index 0 — a fixed order biases the model
    // toward index 0 and skews any harvested decision dataset.
    const coreState = uiToCore(state);
    const legalMoves = shuffle(engine.getLegalMoves(coreState));
    if (legalMoves.length === 0) {
      set({
        aiError: 'No legal moves are available — try drawing or starting a new game.',
        aiAutoPlay: false,
      });
      return;
    }

    // Forced position: exactly one legal move. There is no decision to make, so
    // auto-play it without spending an API call, and log a synthetic interaction
    // (`event: 'forced_move'`) so the harvested move sequence stays complete.
    // This path lives entirely inside the advisor flow — a person playing by
    // hand is never auto-advanced; manual play stays natural.
    if (legalMoves.length === 1) {
      const command = legalMoves[0];
      const beforeLen = get().moveHistory.length;
      get().applyMoveCommand(command);
      const afterMoves = get().moveHistory;
      const applied = afterMoves.slice(beforeLen);
      if (applied.length > 0) {
        const annotated = afterMoves.map((move, i) =>
          i < beforeLen ? move : { ...move, aiMove: true },
        );
        annotated[beforeLen] = {
          ...annotated[beforeLen],
          aiReasoning: 'Only one legal move — auto-played.',
        };
        set({ moveHistory: annotated });
      }
      recordAIInteraction({
        id: uuidv7(),
        requestId: uuidv7(),
        sessionId: get().gameSessionId ?? '',
        attempt: 1,
        timestamp: Date.now(),
        provider: config.provider,
        model: config.model,
        seed: state.seed,
        turnIndex: beforeLen,
        config,
        event: 'forced_move',
        movesApplied: applied.map((m) => m.type),
        outcome: 'success',
        durationMs: 0,
        prompt: '',
      });
      set({ aiError: undefined, aiStatus: undefined });
      if (get().aiAutoPlay) get().continueAIAutoPlay();
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
          sessionId: get().gameSessionId,
          seed: state.seed,
          turnIndex: state.moveHistory.length,
          config,
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

      // Resignation: `move_index: -1` means the model surrendered the game
      // because no legal move can productively advance and drawing is
      // exhausted. The 2026-05-26 ask wired this through; the harness applies
      // no move, records the decision with `moveType: 'resign'`, stops
      // auto-play, and ends the session. The interaction was logged by the
      // provider with `outcome: 'resigned'` and the decision's analysis text
      // / confidence intact.
      if (decision.moveIndex === -1) {
        setLastInteractionMovesApplied([]);
        const interaction = getLastAIInteraction();
        const record: AIDecisionRecord = {
          timestamp: Date.now(),
          moveType: 'resign',
          describe: 'AI resigned',
          boardAnalysis: decision.boardAnalysis,
          reasoning: decision.reasoning,
          confidence: decision.confidence,
          model: config.model,
          requestId,
          moveIndex: -1,
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
          aiStatus: 'AI resigned.',
          aiDecisionLog,
          aiError: undefined,
          aiAutoPlay: false,
        });
        console.info(
          `[AI] resign applied in ${((Date.now() - requestStartedAt) / 1000).toFixed(1)}s`,
        );
        return;
      }

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

      // Apply the move, then annotate the new move-history entries: every
      // entry of the move is flagged as an AI move (so a multi-card move
      // reads as one AI action, not a mix), and the lead entry carries the
      // reasoning the Activity Log surfaces.
      const beforeLen = get().moveHistory.length;
      get().applyMoveCommand(command);
      const afterMoves = get().moveHistory;
      if (afterMoves.length > beforeLen) {
        const annotated = afterMoves.map((move, i) =>
          i < beforeLen ? move : { ...move, aiMove: true },
        );
        annotated[beforeLen] = {
          ...annotated[beforeLen],
          aiReasoning: decision.reasoning,
          aiConfidence: decision.confidence,
        };
        set({ moveHistory: annotated });
      }

      // Attach the move-history entry types this decision produced to its
      // interaction, so a consequence entry (e.g. an automatic `flip_card`) is
      // not misread as a turn with a missing log entry.
      setLastInteractionMovesApplied(
        afterMoves.slice(beforeLen).map((m) => m.type),
      );

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
        // Honor a server-suggested wait (e.g. a 429 RetryInfo) so auto-play
        // does not re-attempt before a rate-limit window has cleared.
        const cooldownMs =
          err instanceof AIError && err.retryAfterMs !== undefined
            ? err.retryAfterMs
            : AI_AUTO_RETRY_COOLDOWN;
        set({
          aiThinking: false,
          aiThinkingSince: undefined,
          aiStatus: undefined,
          aiError: `${message} Auto-play retries in ${Math.round(cooldownMs / 1000)}s.`,
        });
        setTimeout(() => {
          if (get().aiAutoPlay && !get().aiThinking) {
            void get().askAIForMove();
          }
        }, cooldownMs);
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
    aiAutoLastProgress = null;
    aiAutoStallCount = 0;
    aiAutoRecentMoveTypes = [];
    aiAutoStalled = false;
    // Arm the token-runaway cap. A fresh run pauses at the AI_AUTO_TURN_CAP
    // boundary; resuming at or past it grants another increment of moves, so
    // each manual restart is a deliberate opt-in for more spend.
    const movesAtStart = state.moveHistory.length;
    aiAutoTurnCap =
      movesAtStart < AI_AUTO_TURN_CAP
        ? AI_AUTO_TURN_CAP
        : movesAtStart + AI_AUTO_TURN_CAP_RESUME_INCREMENT;
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

    // Token-runaway cap: pause once the run reaches its move budget and require
    // a deliberate manual resume. Unlike the stall/loop terminators below (which
    // catch *unproductive* play), this fires even on a healthy, progressing game
    // so an unattended tab cannot spend tokens without bound.
    if (state.moveHistory.length >= aiAutoTurnCap) {
      set({
        aiAutoPlay: false,
        aiError:
          `AI auto-play paused at the ${aiAutoTurnCap}-move cap ` +
          `(token-runaway guard). Click AI Auto-Play to resume for ` +
          `another ${AI_AUTO_TURN_CAP_RESUME_INCREMENT} moves.`,
      });
      return;
    }

    // Loop detection: a position recurring is allowed up to AI_AUTO_LOOP_LIMIT
    // times — the AI may legitimately unwind and retry a line — but a position
    // seen that many times means it is genuinely stuck, so stop.
    const hash = hashGameState(uiToCore(state));
    const timesSeen = aiAutoStateHistory.filter((h) => h === hash).length;
    if (timesSeen >= AI_AUTO_LOOP_LIMIT) {
      set({
        aiAutoPlay: false,
        aiError:
          `AI auto-play stopped: the board returned to the same position ` +
          `${AI_AUTO_LOOP_LIMIT} times (stuck loop).`,
      });
      return;
    }
    aiAutoStateHistory = [...aiAutoStateHistory, hash].slice(-AI_AUTO_HISTORY_LIMIT);

    // Stall detection — two-gate rule. A turn is "flat" when neither a card
    // reached a foundation nor a face-down card was revealed. A few flat turns
    // are normal (cycling the stock to reach a card); AI_AUTO_STALL_LIMIT in a
    // row is the first gate. The second gate is the *shuffle fraction* over
    // the plateau: a long flat run dominated by `tableau_to_tableau` /
    // `discard_to_tableau` is a doom-loop and terminates; the same length
    // dominated by `draw_card` / `recycle_stock` is an honest hunt for a still
    // face-down card and is allowed to continue. Loop detection above misses
    // both cases — the board keeps changing — so this is a separate guard.
    // Log it so a harvested game reads as auto-terminated, not abandoned.
    const { foundationCards, faceDownTotal } = computeProgressComponents(state);
    const lastInteractionMoveType = getLastAIInteraction()?.movesApplied?.[0];
    if (
      aiAutoLastProgress &&
      aiAutoLastProgress.f === foundationCards &&
      aiAutoLastProgress.d === faceDownTotal
    ) {
      aiAutoStallCount += 1;
      if (lastInteractionMoveType) aiAutoRecentMoveTypes.push(lastInteractionMoveType);
    } else {
      aiAutoStallCount = 0;
      aiAutoRecentMoveTypes = [];
    }
    aiAutoLastProgress = { f: foundationCards, d: faceDownTotal };
    if (shouldTerminateOnStall(aiAutoStallCount, aiAutoRecentMoveTypes)) {
      const stallConfig = state.aiConfig ?? DEFAULT_AI_CONFIG;
      const fraction = shuffleFraction(aiAutoRecentMoveTypes);
      const window = [...aiAutoRecentMoveTypes];
      aiAutoStalled = true;
      recordAIInteraction({
        id: uuidv7(),
        requestId: uuidv7(),
        sessionId: state.gameSessionId ?? '',
        attempt: 1,
        timestamp: Date.now(),
        provider: stallConfig.provider,
        model: stallConfig.model,
        seed: state.seed,
        turnIndex: state.moveHistory.length,
        config: stallConfig,
        event: 'stall_terminated',
        plateauLength: aiAutoStallCount,
        shuffleFraction: fraction,
        moveTypeWindow: window,
        outcome: 'success',
        durationMs: 0,
        prompt: '',
      });
      set({
        aiAutoPlay: false,
        aiError:
          `AI auto-play stopped: no progress for ${aiAutoStallCount} turns ` +
          `with ${Math.round(fraction * 100)}% shuffle moves ` +
          `(threshold ${Math.round(AI_AUTO_STALL_SHUFFLE_FRACTION * 100)}%).`,
      });
      return;
    }

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
          : aiAutoStalled
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
    // Restoring a game invalidates any in-flight AI request.
    aiAbortController?.abort();
    aiAbortController = null;
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
}));

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
