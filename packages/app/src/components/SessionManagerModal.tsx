/**
 * Saved-games manager.
 *
 * Lists every game persisted in this browser (see {@link module:store/sessionPersistence})
 * and lets the player resume or delete one, or start a new game. It is opened
 * from the control panel, and automatically on a plain first visit when saved
 * games exist.
 *
 * @module components/SessionManagerModal
 */

import { useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { SessionMeta } from '../store/sessionPersistence';

const DIFFICULTY_NAMES = ['', 'Very Easy', 'Easy', 'Normal', 'Hard', 'Very Hard'];

/** Format a save's `updatedAt` timestamp as a short relative time. */
function relativeTime(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/** Modal body — mounted only while the modal is open, so state starts fresh. */
const SessionManagerContent: React.FC = () => {
  const setSessionManagerOpen = useGameStore((s) => s.setSessionManagerOpen);
  const listSavedSessions = useGameStore((s) => s.listSavedSessions);
  const loadSavedSession = useGameStore((s) => s.loadSavedSession);
  const deleteSavedSession = useGameStore((s) => s.deleteSavedSession);
  const initializeGame = useGameStore((s) => s.initializeGame);
  const currentSessionId = useGameStore((s) => s.gameSessionId);

  const [sessions, setSessions] = useState<SessionMeta[]>(() => listSavedSessions());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setSessions(listSavedSessions());
  }, [listSavedSessions]);

  const close = () => setSessionManagerOpen(false);

  const handleResume = (sessionId: string) => {
    if (sessionId === currentSessionId) {
      close();
      return;
    }
    if (loadSavedSession(sessionId)) close();
  };

  const handleDelete = (sessionId: string) => {
    if (confirmingId !== sessionId) {
      setConfirmingId(sessionId);
      return;
    }
    deleteSavedSession(sessionId);
    setConfirmingId(null);
    refresh();
  };

  const handleNewGame = () => {
    initializeGame();
    close();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saved games"
      data-testid="session-manager-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={close}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Saved Games</h2>
            <p className="text-xs text-gray-500">
              Games are saved automatically in this browser.
            </p>
          </div>
          <button
            type="button"
            data-testid="session-manager-close"
            onClick={close}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {sessions.length === 0 ? (
          <p className="text-sm text-gray-600 bg-gray-100 rounded px-3 py-6 text-center">
            No saved games yet. Play a move and your game is kept here.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {sessions.map((s) => {
              const isCurrent = s.sessionId === currentSessionId;
              return (
                <li
                  key={s.sessionId}
                  data-testid={`session-row-${s.sessionId}`}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <span>
                        #{s.sessionId.slice(-6)}
                        {s.seed !== undefined ? ` · seed ${s.seed}` : ''}
                      </span>
                      {s.gameWon && (
                        <span className="text-xs font-bold text-green-700">🏆 Won</span>
                      )}
                      {isCurrent && (
                        <span className="text-xs font-medium text-blue-600">· current</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {DIFFICULTY_NAMES[s.difficulty] ?? 'Normal'} · {s.completionProgress}%
                      complete · {s.moveCount} moves · {relativeTime(s.updatedAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="resume-session-btn"
                    onClick={() => handleResume(s.sessionId)}
                    className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3 rounded transition-colors"
                  >
                    {isCurrent ? 'Close' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    data-testid="delete-session-btn"
                    onClick={() => handleDelete(s.sessionId)}
                    className="shrink-0 bg-gray-200 hover:bg-red-100 text-red-700 text-xs font-semibold py-1.5 px-3 rounded transition-colors"
                  >
                    {confirmingId === s.sessionId ? 'Confirm?' : 'Delete'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            data-testid="session-manager-new-game"
            onClick={handleNewGame}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
};

/** Saved-games modal — renders only while open. */
const SessionManagerModal: React.FC = () => {
  const open = useGameStore((s) => s.sessionManagerOpen);
  return open ? <SessionManagerContent /> : null;
};

export default SessionManagerModal;
