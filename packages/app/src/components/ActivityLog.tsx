import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Move, Card } from '../types';

const ActivityLog: React.FC = () => {
  const moveHistory = useGameStore((state) => state.moveHistory);
  const [isMinimized, setIsMinimized] = useState(false);
  // "Clear View" hides the log until the next move arrives. Remembering the
  // history length at clear time keeps visibleLogs a pure derivation of
  // moveHistory, rather than mirroring it into state via a setState-in-effect.
  const [clearedAtLength, setClearedAtLength] = useState(-1);

  const visibleLogs: Move[] =
    moveHistory.length === clearedAtLength ? [] : moveHistory;

  const formatCard = (card: Card): string => {
    const suitSymbols: Record<string, string> = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠',
    };
    return `${card.rank}${suitSymbols[card.suit]}`;
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  const formatMove = (move: Move): string => {
    const time = formatTime(move.timestamp);
    const cardStr = formatCard(move.card);

    switch (move.type) {
      case 'draw_card':
        return `${time} - Drew ${cardStr} from draw pile`;
      
      case 'tableau_to_tableau':
        return `${time} - Moved ${cardStr} from column ${(move.from?.columnIndex ?? 0) + 1} to column ${(move.to?.columnIndex ?? 0) + 1}`;
      
      case 'tableau_to_foundation':
        return `${time} - Moved ${cardStr} to ${move.to?.suit} foundation`;
      
      case 'discard_to_tableau':
        return `${time} - Moved ${cardStr} from discard to column ${(move.to?.columnIndex ?? 0) + 1}`;
      
      case 'discard_to_foundation':
        return `${time} - Moved ${cardStr} from discard to ${move.to?.suit} foundation`;
      
      case 'flip_card':
        return `${time} - Flipped ${cardStr} face up in column ${(move.from?.columnIndex ?? 0) + 1}`;
      
      case 'autoplay_start':
        return `${time} - ▶️ Auto-play started`;
      
      case 'autoplay_stop':
        return `${time} - ⏸️ Auto-play stopped`;
      
      case 'autoplay_deadend':
        return `${time} - 🚫 Auto-play stopped - No valid moves available (deadend)`;
      
      case 'autoplay_loop_detected':
        return `${time} - 🔄 Auto-play stopped - Loop detected`;
      
      default:
        return `${time} - Unknown move`;
    }
  };

  const handleCopyToClipboard = async () => {
    const logText = visibleLogs.map(move => formatMove(move)).join('\n');
    try {
      await navigator.clipboard.writeText(logText);
      // Could add a temporary success message here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleClearView = () => {
    setClearedAtLength(moveHistory.length);
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <div data-testid="activity-log" className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl w-full overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
        <h3 className="text-lg font-bold">Activity Log</h3>
        <button
          data-testid="activity-log-toggle-btn"
          onClick={handleToggleMinimize}
          className="hover:bg-blue-700 rounded px-2 py-1 transition-colors text-sm font-semibold"
          aria-label={isMinimized ? 'Expand' : 'Minimize'}
        >
          {isMinimized ? '▼' : '▲'}
        </button>
      </div>

      {/* Content */}
      {!isMinimized && (
        <>
          {/* Controls */}
          <div className="p-3 border-b border-gray-200 flex gap-2">
            <button
              data-testid="activity-log-copy-btn"
              onClick={handleCopyToClipboard}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded transition-colors text-sm"
              disabled={visibleLogs.length === 0}
            >
              📋 Copy
            </button>
            <button
              data-testid="activity-log-clear-btn"
              onClick={handleClearView}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded transition-colors text-sm"
              disabled={visibleLogs.length === 0}
            >
              🗑️ Clear View
            </button>
          </div>

          {/* Log Display */}
          <div data-testid="activity-log-entries" className="h-48 lg:h-96 overflow-y-auto p-3 bg-gray-50">
            {visibleLogs.length === 0 ? (
              <p className="text-gray-500 text-center text-sm mt-8">No activities yet</p>
            ) : (
              <div className="space-y-1">
                {[...visibleLogs].reverse().map((move, index) => {
                  const isAutoPlayEvent = move.type.startsWith('autoplay_');
                  const isDeadendOrLoop = move.type === 'autoplay_deadend' || move.type === 'autoplay_loop_detected';
                  return (
                    <div
                      key={`${move.timestamp}-${index}`}
                      data-testid="activity-log-entry"
                      className={`text-xs p-2 rounded shadow-sm border transition-colors ${
                        isDeadendOrLoop
                          ? 'bg-red-50 border-red-300 text-red-900 font-semibold'
                          : isAutoPlayEvent
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                          : 'bg-white border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {formatMove(move)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 bg-gray-100 border-t border-gray-200">
            <p data-testid="activity-log-count" className="text-xs text-gray-600 text-center">
              Total: {visibleLogs.length} {visibleLogs.length === 1 ? 'activity' : 'activities'}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityLog;
