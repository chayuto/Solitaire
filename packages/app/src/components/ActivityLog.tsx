import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Move, Card } from '../types';

const ActivityLog: React.FC = () => {
  const moveHistory = useGameStore((state) => state.moveHistory);
  const [isMinimized, setIsMinimized] = useState(false);
  // The scrollable entries container. Newest entries render at the top, so we
  // scroll back to the top whenever a move lands to keep the latest visible.
  const entriesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (entriesRef.current) {
      entriesRef.current.scrollTop = 0;
    }
  }, [moveHistory.length]);
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

  // A multi-card tableau-to-tableau move is stored as one Move per card
  // (gameStore moveCardToTableau), so the log would otherwise repeat the same
  // "Moved X from column A to column B" line once per card. We collapse a run
  // of those into a single display entry that names both ends of the moved
  // stack — see formatMove's 'tableau_to_tableau' branch below.
  type DisplayEntry =
    | { kind: 'single'; move: Move }
    | { kind: 'sequence'; lead: Move; tail: Move; count: number };

  const coalesceMoves = (moves: Move[]): DisplayEntry[] => {
    const out: DisplayEntry[] = [];
    let i = 0;
    while (i < moves.length) {
      const m = moves[i];
      const fromCol = m.from?.columnIndex;
      const toCol = m.to?.columnIndex;
      const fromIdx = m.from?.cardIndex;
      if (
        m.type === 'tableau_to_tableau' &&
        fromCol !== undefined &&
        toCol !== undefined &&
        fromIdx !== undefined
      ) {
        // Extend as long as the next entry is the next card in the same
        // source slice landing on the same destination. Tail entries carry
        // no reasoning/confidence of their own (the AI annotation puts those
        // only on the lead) — stop early if one does, so we never swallow a
        // distinct AI decision.
        let j = i + 1;
        while (j < moves.length) {
          const n = moves[j];
          const prev = moves[j - 1];
          if (
            n.type !== 'tableau_to_tableau' ||
            n.from?.columnIndex !== fromCol ||
            n.to?.columnIndex !== toCol ||
            n.from?.cardIndex === undefined ||
            prev.from?.cardIndex === undefined ||
            n.from.cardIndex !== prev.from.cardIndex + 1 ||
            n.aiReasoning !== undefined ||
            n.aiConfidence !== undefined
          ) {
            break;
          }
          j++;
        }
        if (j > i + 1) {
          out.push({ kind: 'sequence', lead: m, tail: moves[j - 1], count: j - i });
          i = j;
          continue;
        }
      }
      out.push({ kind: 'single', move: m });
      i++;
    }
    return out;
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

  const formatEntry = (entry: DisplayEntry): string => {
    if (entry.kind === 'single') return formatMove(entry.move);
    const { lead, tail, count } = entry;
    const time = formatTime(lead.timestamp);
    const fromCol = (lead.from?.columnIndex ?? 0) + 1;
    const toCol = (lead.to?.columnIndex ?? 0) + 1;
    return `${time} - Moved ${formatCard(lead.card)} → ${formatCard(tail.card)} (${count} cards) from column ${fromCol} to column ${toCol}`;
  };

  const displayEntries: DisplayEntry[] = coalesceMoves(visibleLogs);

  const handleCopyToClipboard = async () => {
    const logText = displayEntries.map(formatEntry).join('\n');
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
          <div ref={entriesRef} data-testid="activity-log-entries" className="h-48 lg:h-96 overflow-y-auto p-3 bg-gray-50">
            {displayEntries.length === 0 ? (
              <p className="text-gray-500 text-center text-sm mt-8">No activities yet</p>
            ) : (
              <div className="space-y-1">
                {[...displayEntries].reverse().map((entry, index) => {
                  // AI flags live on the lead entry of a sequence; tail entries
                  // are intentionally skipped by coalesceMoves when they carry
                  // their own reasoning, so reading from `lead` here is safe.
                  const lead = entry.kind === 'single' ? entry.move : entry.lead;
                  const isAutoPlayEvent = lead.type.startsWith('autoplay_');
                  const isDeadendOrLoop = lead.type === 'autoplay_deadend' || lead.type === 'autoplay_loop_detected';
                  const isAIMove = lead.aiMove === true || typeof lead.aiReasoning === 'string';
                  return (
                    <div
                      key={`${lead.timestamp}-${index}`}
                      data-testid="activity-log-entry"
                      className={`text-xs p-2 rounded shadow-sm border transition-colors ${
                        isDeadendOrLoop
                          ? 'bg-red-50 border-red-300 text-red-900 font-semibold'
                          : isAutoPlayEvent
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                          : isAIMove
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                          : 'bg-white border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div>
                        {isAIMove && <span className="mr-1" aria-label="AI move">🤖</span>}
                        {formatEntry(entry)}
                      </div>
                      {isAIMove && (
                        <div
                          data-testid="activity-log-ai-reasoning"
                          className="mt-1 pl-4 text-[11px] italic text-indigo-700 whitespace-pre-wrap break-words"
                        >
                          {lead.aiConfidence !== undefined && (
                            <span className="not-italic font-semibold">
                              [{Math.round(lead.aiConfidence * 100)}%]{' '}
                            </span>
                          )}
                          {lead.aiReasoning}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 bg-gray-100 border-t border-gray-200">
            <p data-testid="activity-log-count" className="text-xs text-gray-600 text-center">
              Total: {displayEntries.length} {displayEntries.length === 1 ? 'activity' : 'activities'}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityLog;
