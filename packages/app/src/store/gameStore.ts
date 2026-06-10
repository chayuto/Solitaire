/**
 * The game store — assembly of the per-concern slices over one flat Zustand
 * state. Components keep selecting fields off a single `useGameStore`.
 *
 * - Initial state (fresh deal or restored save): ./initialState
 * - Board mutations: ./applyMove via the game slice (ADR-0005)
 * - AI orchestration: ai/advisorController, injected here
 * - Autosave side effects: ./persistence, initialised from main.tsx
 */
import { create } from 'zustand';
import { createAdvisorController } from '../ai/advisorController';
import { engine } from './engine';
import { buildInitialState } from './initialState';
import { createGameSlice } from './slices/gameSlice';
import { createUiSlice } from './slices/uiSlice';
import { createAutoplaySlice } from './slices/autoplaySlice';
import { createReplaySlice } from './slices/replaySlice';
import { createAiSlice } from './slices/aiSlice';
import { createSessionSlice } from './slices/sessionSlice';
import type { GameStore } from './types';

export type { GameStore } from './types';

export const useGameStore = create<GameStore>((set, get) => {
  // The AI advisor orchestration lives in ai/advisorController; it receives
  // store access by injection so ai/ never imports the store (ADR boundary).
  const advisor = createAdvisorController({ get, set, engine });

  return {
    ...buildInitialState(),
    ...createGameSlice(set, get, advisor),
    ...createUiSlice(set, get),
    ...createAutoplaySlice(set, get),
    ...createReplaySlice(set, get),
    ...createAiSlice(set, get, advisor),
    ...createSessionSlice(set, get, advisor),
  };
});
