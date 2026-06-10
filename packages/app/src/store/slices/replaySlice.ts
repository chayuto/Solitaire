/**
 * Replay slice — replays the recorded game from the initial deal. Board
 * re-derivation lives in the pure {@link replayBoardAt} reducer.
 */
import { getCompletionProgress } from '@chayuto/solitaire-core';
import { uiToCore } from '../../adapters/coreAdapter';
import { replayBoardAt } from '../replayReducer';
import type { GameStore, StoreGet, StoreSet } from '../types';

type ReplaySlice = Pick<
  GameStore,
  | 'startReplay'
  | 'pauseReplay'
  | 'resumeReplay'
  | 'stopReplay'
  | 'stepForward'
  | 'stepBackward'
  | 'setReplaySpeed'
  | 'goToReplayIndex'
>;

export function createReplaySlice(set: StoreSet, get: StoreGet): ReplaySlice {
  return {
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

    const board = replayBoardAt(state.initialBoardSetup, state.moveHistory, targetIndex);

    // Calculate completion progress for the replayed board
    const completionProgress = getCompletionProgress(uiToCore({ ...state, ...board }));

    set({
      ...board,
      selectedCard: undefined,
      replayIndex: targetIndex,
      completionProgress,
    });
  },
  };
}
