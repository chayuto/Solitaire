/**
 * Session slice — the saved-games manager: load/delete/list persisted
 * sessions and the manager modal.
 */
import { loadSession, deleteSession, listSessions } from '../sessionPersistence';
import { isRestorable, hydratePersisted } from '../initialState';
import type { AdvisorController } from '../../ai/advisorController';
import type { GameStore, StoreGet, StoreSet } from '../types';

type SessionSlice = Pick<
  GameStore,
  'loadSavedSession' | 'deleteSavedSession' | 'listSavedSessions' | 'setSessionManagerOpen'
>;

export function createSessionSlice(set: StoreSet, _get: StoreGet, advisor: AdvisorController): SessionSlice {
  return {
  loadSavedSession: (sessionId: string) => {
    const persisted = loadSession(sessionId);
    if (!isRestorable(persisted)) return false;
    // Restoring a game invalidates the in-flight AI request and per-run state.
    advisor.resetRunState();
    set({ ...hydratePersisted(persisted), sessionManagerOpen: false });
    return true;
  },

  deleteSavedSession: (sessionId: string) => {
    deleteSession(sessionId);
  },

  listSavedSessions: () => listSessions(),

  setSessionManagerOpen: (open: boolean) => {
    set({ sessionManagerOpen: open });
  },
  };
}
