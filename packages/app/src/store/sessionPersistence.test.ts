/**
 * Tests for per-session game persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  MAX_SESSIONS,
} from './sessionPersistence';
import type { GameState, Move } from '../types';

const aMove: Move = {
  type: 'draw_card',
  timestamp: 0,
  card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'h-a' },
};

/** Build a minimal but structurally valid game state. */
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    drawPile: [],
    discardPile: [],
    foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
    tableau: [[], [], [], [], [], [], []],
    moveHistory: [aMove],
    showValidMoves: true,
    godMode: false,
    autoPlayEnabled: false,
    autoPlayInProgress: false,
    difficulty: 3,
    seed: 42,
    gameSessionId: 'session-1',
    gameStartedAt: 1000,
    gameWon: false,
    completionProgress: 25,
    replayMode: false,
    replayIndex: 0,
    replayPaused: false,
    replaySpeed: 1000,
    ...overrides,
  };
}

describe('sessionPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves and reloads a game by its session id', () => {
    saveSession(makeState({ gameSessionId: 's-A', seed: 7, completionProgress: 40 }));
    const loaded = loadSession('s-A');
    expect(loaded).not.toBeNull();
    expect(loaded?.gameSessionId).toBe('s-A');
    expect(loaded?.seed).toBe(7);
    expect(loaded?.completionProgress).toBe(40);
    expect(loaded?.moveHistory).toHaveLength(1);
  });

  it('returns null for a missing or corrupt session', () => {
    expect(loadSession('nope')).toBeNull();
    localStorage.setItem('solitaire:save:bad', '{not json');
    expect(loadSession('bad')).toBeNull();
  });

  it('skips an untouched, move-free deal', () => {
    saveSession(makeState({ gameSessionId: 's-empty', moveHistory: [], gameWon: false }));
    expect(loadSession('s-empty')).toBeNull();
  });

  it('persists a won game even with no recorded moves', () => {
    saveSession(makeState({ gameSessionId: 's-won', moveHistory: [], gameWon: true }));
    expect(loadSession('s-won')?.gameWon).toBe(true);
  });

  it('lists saved games most-recently-updated first', () => {
    let now = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => (now += 1000));
    saveSession(makeState({ gameSessionId: 's-old' }));
    saveSession(makeState({ gameSessionId: 's-mid' }));
    saveSession(makeState({ gameSessionId: 's-new' }));
    expect(listSessions().map((m) => m.sessionId)).toEqual(['s-new', 's-mid', 's-old']);
  });

  it('deletes a saved game', () => {
    saveSession(makeState({ gameSessionId: 's-del' }));
    expect(loadSession('s-del')).not.toBeNull();
    deleteSession('s-del');
    expect(loadSession('s-del')).toBeNull();
  });

  it('evicts the oldest game once the cap is exceeded', () => {
    let now = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => (now += 1000));
    for (let i = 0; i < MAX_SESSIONS + 1; i++) {
      saveSession(makeState({ gameSessionId: `s-${i}` }));
    }
    const ids = listSessions().map((m) => m.sessionId);
    expect(ids).toHaveLength(MAX_SESSIONS);
    // The first-saved (oldest) game was evicted; the newest survived.
    expect(ids).not.toContain('s-0');
    expect(ids).toContain(`s-${MAX_SESSIONS}`);
  });

  it('overwriting an existing game never evicts it', () => {
    let now = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => (now += 1000));
    // Fill to the cap.
    for (let i = 0; i < MAX_SESSIONS; i++) {
      saveSession(makeState({ gameSessionId: `s-${i}` }));
    }
    // Re-save the oldest — it must still be present afterwards.
    saveSession(makeState({ gameSessionId: 's-0', completionProgress: 99 }));
    expect(loadSession('s-0')?.completionProgress).toBe(99);
    expect(listSessions()).toHaveLength(MAX_SESSIONS);
  });
});
