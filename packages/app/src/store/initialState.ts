/**
 * Initial-state construction and persisted-snapshot hydration.
 *
 * Used by the store assembly (first deal / restore-on-load), the game slice
 * (new game) and the session slice (load saved game).
 */
import {
  arrangeDeckByDifficulty,
  getPerceivedDifficulty,
} from '@chayuto/solitaire-core';
import type { GameState, Card, Difficulty } from '../types';
import { uiToCore } from '../adapters/coreAdapter';
import { splitLegacyMoveHistory } from './migrations';
import { initialGameConfig } from './urlConfig';
import { DEFAULT_DIFFICULTY, TABLEAU_COLUMNS } from '../constants';
import { DEFAULT_AI_CONFIG, uuidv7 } from '../ai';
import { resolveActiveSessionId, wasCleanVisit } from './activeSession';
import { loadSession, listSessions, type PersistedGameState } from './sessionPersistence';

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
export const initializeGameState = (
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
export function isRestorable(p: PersistedGameState | null): p is PersistedGameState {
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
export function hydratePersisted(p: PersistedGameState): GameState {
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
export function buildInitialState(): GameState {
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
