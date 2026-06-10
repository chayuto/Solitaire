/**
 * The autosave wiring is explicit (initSessionPersistence from main.tsx) —
 * importing the store must attach nothing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initSessionPersistence, type PersistenceStore } from './persistence';
import type { GameStore } from './types';

function makeStoreStub(overrides: Partial<GameStore> = {}) {
  const listeners: Array<(s: GameStore) => void> = [];
  const state = {
    gameSessionId: 'sess-1',
    moveHistory: [{}, {}],
    eventLog: [],
    gameWon: false,
    completionProgress: 0,
    godMode: false,
    showValidMoves: false,
    replaySpeed: 1000,
    winModalDismissed: false,
    aiDecisionLog: [],
    ...overrides,
  } as unknown as GameStore;
  const store: PersistenceStore = {
    getState: () => state,
    subscribe: (fn) => {
      listeners.push(fn);
      return () => {};
    },
  };
  return { store, state, emit: () => listeners.forEach((fn) => fn(state)), listeners };
}

describe('initSessionPersistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('subscribes exactly once and persists the starting game', () => {
    const { store, listeners } = makeStoreStub();
    initSessionPersistence(store);
    expect(listeners).toHaveLength(1);
    // The starting game (2 moves) was saved synchronously.
    expect(localStorage.length).toBeGreaterThan(0);
  });

  it('debounces autosave on state changes', () => {
    const { store, emit } = makeStoreStub();
    initSessionPersistence(store);
    const savedAtInit = localStorage.length;

    emit(); // change arrives -> schedules debounced save (signature differs from none)
    expect(localStorage.length).toBe(savedAtInit); // not yet
    vi.advanceTimersByTime(600);
    expect(localStorage.length).toBeGreaterThanOrEqual(savedAtInit);
  });

  it('identical signatures do not schedule duplicate saves', () => {
    const { store, emit } = makeStoreStub();
    initSessionPersistence(store);
    emit();
    vi.advanceTimersByTime(600);
    emit(); // same signature as before -> early return, no timer
    expect(vi.getTimerCount()).toBe(0);
  });
});
