/**
 * Tests for the game store's saved-session actions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { saveSession, loadSession } from './sessionPersistence';
import type { Move } from '../types';

const aMove: Move = {
  type: 'draw_card',
  timestamp: 0,
  card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'h-a' },
};

describe('gameStore — saved sessions', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().initializeGame(3, 1);
  });

  it('setSessionManagerOpen toggles the modal flag', () => {
    useGameStore.getState().setSessionManagerOpen(true);
    expect(useGameStore.getState().sessionManagerOpen).toBe(true);
    useGameStore.getState().setSessionManagerOpen(false);
    expect(useGameStore.getState().sessionManagerOpen).toBe(false);
  });

  it('loadSavedSession restores a saved game into the store', () => {
    // Seed a saved game directly in storage.
    saveSession({
      ...useGameStore.getState(),
      gameSessionId: 'saved-x',
      seed: 555,
      moveHistory: [aMove],
      sessionManagerOpen: true,
    });

    const ok = useGameStore.getState().loadSavedSession('saved-x');
    expect(ok).toBe(true);

    const state = useGameStore.getState();
    expect(state.gameSessionId).toBe('saved-x');
    expect(state.seed).toBe(555);
    expect(state.moveHistory).toHaveLength(1);
    // Restoring closes the manager and resets transient state.
    expect(state.sessionManagerOpen).toBe(false);
    expect(state.aiThinking).toBe(false);
    expect(state.replayMode).toBe(false);
  });

  it('loadSavedSession returns false for an unknown id', () => {
    expect(useGameStore.getState().loadSavedSession('does-not-exist')).toBe(false);
  });

  it('deleteSavedSession removes a save from storage', () => {
    saveSession({
      ...useGameStore.getState(),
      gameSessionId: 'saved-del',
      moveHistory: [aMove],
    });
    expect(loadSession('saved-del')).not.toBeNull();

    useGameStore.getState().deleteSavedSession('saved-del');
    expect(loadSession('saved-del')).toBeNull();
  });

  it('listSavedSessions reports saved games', () => {
    saveSession({
      ...useGameStore.getState(),
      gameSessionId: 'saved-list',
      moveHistory: [aMove],
    });
    const ids = useGameStore.getState().listSavedSessions().map((m) => m.sessionId);
    expect(ids).toContain('saved-list');
  });
});
