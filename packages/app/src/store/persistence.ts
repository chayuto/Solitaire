/**
 * Session persistence side effects: anchor the tab to its game, persist the
 * starting state, and debounce-autosave on change.
 *
 * Explicitly initialised from main.tsx (NOT a module side effect) so that
 * importing the store in tests attaches no subscribers and runs no timers.
 */
import type { GameStore } from './types';
import { saveSession } from './sessionPersistence';
import { setActiveSessionId } from './activeSession';

/** Debounce window (ms) for autosaving the active game after a change. */
const SESSION_AUTOSAVE_DELAY = 500;

/** The minimal store surface the persistence wiring needs. */
export interface PersistenceStore {
  getState: () => GameStore;
  subscribe: (listener: (state: GameStore) => void) => () => void;
}

export function initSessionPersistence(store: PersistenceStore): void {
  if (typeof window === 'undefined') return;

  const firstId = store.getState().gameSessionId;
  if (firstId) setActiveSessionId(firstId);
  // Persist the starting game so even an immediate reload restores it. (An
  // untouched, move-free deal is skipped by saveSession — nothing to lose.)
  saveSession(store.getState());

  let anchoredId = firstId;
  let lastSignature = '';
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  store.subscribe((state) => {
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
      saveSession(store.getState());
    }, SESSION_AUTOSAVE_DELAY);
  });
}
