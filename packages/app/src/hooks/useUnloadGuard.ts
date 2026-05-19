/**
 * Warns the player before the page unloads while a game is in progress.
 *
 * The game state lives only in memory, so an accidental navigation — a
 * swipe-back gesture that slips past the `overscroll-behavior` guard, a closed
 * tab, or a reload — silently discards an unfinished game. This hook attaches a
 * `beforeunload` handler so the browser shows its native "Leave site?" prompt.
 *
 * The handler is attached only while a warning is warranted: a board that has
 * been touched (`moveHistory` is non-empty) and is not yet won. An untouched or
 * finished game never prompts. Modern browsers ignore any custom message text
 * and show their own generic dialog.
 *
 * @module hooks/useUnloadGuard
 */

import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

/** Prompt before unload while an unfinished, in-progress game would be lost. */
export function useUnloadGuard(): void {
  const inProgress = useGameStore((s) => s.moveHistory.length > 0 && !s.gameWon);

  useEffect(() => {
    if (!inProgress) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy browsers require `returnValue` to be set to trigger the prompt.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [inProgress]);
}
