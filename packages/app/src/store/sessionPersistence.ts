/**
 * Per-session game persistence.
 *
 * Each saved game is stored as a single `localStorage` entry keyed by its
 * session id (`solitaire:save:<sessionId>`). Keeping one entry per game means
 * multiple boards open at once — e.g. Parallel Windows — persist independently
 * and never clobber one another.
 *
 * The saved-games list is derived by *scanning* keys with the shared prefix;
 * there is deliberately no single index entry, so concurrent windows cannot
 * race on a shared registry.
 *
 * @module store/sessionPersistence
 */

import type { GameState } from '../types';

/** Key prefix for every persisted game entry. */
const KEY_PREFIX = 'solitaire:save:';

/** Storage schema version. A saved entry with a different version is ignored. */
const SCHEMA_VERSION = 1;

/** Most-recently-played games to retain; older ones are evicted on write. */
export const MAX_SESSIONS = 12;

/**
 * The {@link GameState} fields that make up a restorable game. Transient state
 * (selection, in-flight AI flags, replay/auto-play progress) is deliberately
 * excluded — it is reset on restore.
 */
export interface PersistedGameState {
  drawPile: GameState['drawPile'];
  discardPile: GameState['discardPile'];
  foundations: GameState['foundations'];
  tableau: GameState['tableau'];
  moveHistory: GameState['moveHistory'];
  showValidMoves: GameState['showValidMoves'];
  godMode: GameState['godMode'];
  difficulty: GameState['difficulty'];
  seed: GameState['seed'];
  gameSessionId: GameState['gameSessionId'];
  gameStartedAt: GameState['gameStartedAt'];
  gameWon: GameState['gameWon'];
  winModalDismissed: GameState['winModalDismissed'];
  initialBoardSetup: GameState['initialBoardSetup'];
  perceivedDifficulty: GameState['perceivedDifficulty'];
  completionProgress: GameState['completionProgress'];
  replaySpeed: GameState['replaySpeed'];
  aiConfig: GameState['aiConfig'];
  aiDecisionLog: GameState['aiDecisionLog'];
}

/** Lightweight, list-friendly summary of a saved game. */
export interface SessionMeta {
  sessionId: string;
  seed?: number;
  difficulty: number;
  /** Completion progress, 0–100 (rounded). */
  completionProgress: number;
  /** Move-history length. */
  moveCount: number;
  gameWon: boolean;
  /** When the game was first saved. */
  createdAt: number;
  /** When the game was last saved. */
  updatedAt: number;
}

/** The full stored shape: schema version, list metadata, and the game state. */
interface StoredSession {
  version: number;
  meta: SessionMeta;
  state: PersistedGameState;
}

/** Whether `localStorage` is usable (it can throw in private modes / SSR). */
function storageAvailable(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/** Extract the restorable subset of a live game state. */
function pickPersisted(state: GameState): PersistedGameState {
  return {
    drawPile: state.drawPile,
    discardPile: state.discardPile,
    foundations: state.foundations,
    tableau: state.tableau,
    moveHistory: state.moveHistory,
    showValidMoves: state.showValidMoves,
    godMode: state.godMode,
    difficulty: state.difficulty,
    seed: state.seed,
    gameSessionId: state.gameSessionId,
    gameStartedAt: state.gameStartedAt,
    gameWon: state.gameWon,
    winModalDismissed: state.winModalDismissed,
    initialBoardSetup: state.initialBoardSetup,
    perceivedDifficulty: state.perceivedDifficulty,
    completionProgress: state.completionProgress,
    replaySpeed: state.replaySpeed,
    aiConfig: state.aiConfig,
    aiDecisionLog: state.aiDecisionLog,
  };
}

/** Parse a stored entry, returning `null` when missing, corrupt, or stale. */
function readEntry(key: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed.version !== SCHEMA_VERSION || !parsed.meta || !parsed.state) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Every persisted-session key currently in `localStorage`. */
function sessionKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(KEY_PREFIX)) keys.push(key);
  }
  return keys;
}

/**
 * Evict the oldest saved games until at most `MAX_SESSIONS - 1` remain, so the
 * caller can write one more. The key being (re)written is exempt — overwriting
 * an existing game must never evict it. Returns whether anything was removed.
 */
function evictForWrite(keyBeingWritten: string): boolean {
  const others = sessionKeys().filter((k) => k !== keyBeingWritten);
  if (others.length < MAX_SESSIONS) return false;

  const byAge = others
    .map((k) => ({ k, updatedAt: readEntry(k)?.meta.updatedAt ?? 0 }))
    .sort((a, b) => a.updatedAt - b.updatedAt);

  let removed = false;
  // Leave room for the new entry: keep at most MAX_SESSIONS - 1 others.
  const excess = others.length - (MAX_SESSIONS - 1);
  for (let i = 0; i < excess && i < byAge.length; i++) {
    localStorage.removeItem(byAge[i].k);
    removed = true;
  }
  return removed;
}

/**
 * Persist a game under its session id. No-op when the state has no session id,
 * storage is unavailable, or the game is an untouched fresh deal (no moves and
 * not won — there is nothing worth restoring). Enforces the {@link MAX_SESSIONS}
 * cap and retries once, after evicting the oldest game, on a quota error.
 */
export function saveSession(state: GameState): void {
  if (!storageAvailable() || !state.gameSessionId) return;
  if (state.moveHistory.length === 0 && !state.gameWon) return;

  const key = KEY_PREFIX + state.gameSessionId;
  const now = Date.now();
  const existing = readEntry(key);

  const stored: StoredSession = {
    version: SCHEMA_VERSION,
    meta: {
      sessionId: state.gameSessionId,
      seed: state.seed,
      difficulty: state.difficulty,
      completionProgress: Math.round(state.completionProgress),
      moveCount: state.moveHistory.length,
      gameWon: state.gameWon,
      createdAt: existing?.meta.createdAt ?? state.gameStartedAt ?? now,
      updatedAt: now,
    },
    state: pickPersisted(state),
  };

  evictForWrite(key);
  const payload = JSON.stringify(stored);
  try {
    localStorage.setItem(key, payload);
  } catch {
    // Quota exceeded — drop the oldest game and try once more.
    if (evictForWrite(key)) {
      try {
        localStorage.setItem(key, payload);
      } catch {
        // Give up silently; an unsaved game is better than a thrown error.
      }
    }
  }
}

/** Load a saved game's persisted state, or `null` when absent/corrupt/stale. */
export function loadSession(sessionId: string): PersistedGameState | null {
  if (!storageAvailable()) return null;
  return readEntry(KEY_PREFIX + sessionId)?.state ?? null;
}

/** Delete a saved game. */
export function deleteSession(sessionId: string): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(KEY_PREFIX + sessionId);
}

/** Every saved game's metadata, most recently played first. */
export function listSessions(): SessionMeta[] {
  if (!storageAvailable()) return [];
  return sessionKeys()
    .map((k) => readEntry(k)?.meta)
    .filter((m): m is SessionMeta => m != null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
