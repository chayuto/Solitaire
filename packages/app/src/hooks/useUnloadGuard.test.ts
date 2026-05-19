/**
 * Tests for the unsaved-game unload guard.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnloadGuard } from './useUnloadGuard';
import { useGameStore } from '../store/gameStore';

/** Dispatch a cancelable `beforeunload` event; return whether it was prevented. */
function fireBeforeUnload(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('useUnloadGuard', () => {
  beforeEach(() => {
    // Start from a fresh, untouched game.
    useGameStore.getState().initializeGame(3, 42);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not prompt for an untouched board', () => {
    renderHook(() => useUnloadGuard());
    expect(fireBeforeUnload()).toBe(false);
  });

  it('prompts once the game is in progress', () => {
    useGameStore.setState({
      moveHistory: [{ type: 'draw_card', timestamp: 0, card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'h-a' } }],
      gameWon: false,
    });
    renderHook(() => useUnloadGuard());
    expect(fireBeforeUnload()).toBe(true);
  });

  it('does not prompt once the game is won', () => {
    useGameStore.setState({
      moveHistory: [{ type: 'draw_card', timestamp: 0, card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'h-a' } }],
      gameWon: true,
    });
    renderHook(() => useUnloadGuard());
    expect(fireBeforeUnload()).toBe(false);
  });

  it('removes the listener on unmount', () => {
    useGameStore.setState({
      moveHistory: [{ type: 'draw_card', timestamp: 0, card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'h-a' } }],
      gameWon: false,
    });
    const { unmount } = renderHook(() => useUnloadGuard());
    expect(fireBeforeUnload()).toBe(true);
    unmount();
    expect(fireBeforeUnload()).toBe(false);
  });
});
