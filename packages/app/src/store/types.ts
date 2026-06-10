/**
 * The combined store type and the set/get signatures every slice receives.
 *
 * The store is one flat Zustand state (components select fields directly);
 * slices are an authoring split, not a runtime nesting.
 */
import type { GameState, Card, Suit, Difficulty } from '../types';
import type { MoveCommand } from '@chayuto/solitaire-core';
import type { AIConfig } from '../ai';
import type { SessionMeta } from './sessionPersistence';

/**
 * A bounded undo/redo snapshot: the replayable board + record state. Session
 * extras (AI flags, config, modals, replay state) are deliberately excluded —
 * undo rewinds the game, not the app — and so is the eventLog, which is
 * append-only telemetry (an undo is itself an event, never erased by redo).
 * Stacks are session-local (not persisted): a reload starts empty.
 */
export interface GameSnapshot {
  drawPile: GameState['drawPile'];
  discardPile: GameState['discardPile'];
  foundations: GameState['foundations'];
  tableau: GameState['tableau'];
  moveHistory: GameState['moveHistory'];
  recycleCount: number;
  completionProgress: number;
  gameWon: boolean;
}

/**
 * GameStore interface extending GameState with action methods
 * Manages all game logic and state mutations for Solitaire
 */
export interface GameStore extends GameState {
  /** Snapshots taken before each applied move (capped; newest last). */
  undoStack: GameSnapshot[];
  /** Snapshots available to re-apply after an undo (cleared by a new move). */
  redoStack: GameSnapshot[];
  initializeGame: (difficulty?: Difficulty, seed?: number) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  /** Rewind the last move (disabled during replay / AI / auto-play). */
  undo: () => void;
  /** Re-apply the most recently undone move. */
  redo: () => void;
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

/** Zustand `set`, as the slices use it (object or updater-fn partials). */
export type StoreSet = (
  partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>),
) => void;

/** Zustand `get`. */
export type StoreGet = () => GameStore;
