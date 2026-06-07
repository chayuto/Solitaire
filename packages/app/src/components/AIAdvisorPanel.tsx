import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { AI_REQUEST_TIMEOUT_MS } from '../ai';
import { modelLabel } from '../utils/modelLabel';

/** Format a millisecond duration as `M:SS`. */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Pick a Tailwind color band for a confidence value. */
function confidenceColor(confidence: number): string {
  if (confidence >= 0.75) return 'bg-green-500';
  if (confidence >= 0.4) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * AIAdvisorPanel — shows the AI advisor's status: an elapsed-time waiting
 * indicator while a request is in flight, the most recent decision with its
 * reasoning and confidence, or the last error.
 */
const AIAdvisorPanel: React.FC = () => {
  const aiThinking = useGameStore((s) => s.aiThinking) ?? false;
  const aiAutoPlay = useGameStore((s) => s.aiAutoPlay) ?? false;
  const aiThinkingSince = useGameStore((s) => s.aiThinkingSince);
  const aiStatus = useGameStore((s) => s.aiStatus);
  const aiRetryCount = useGameStore((s) => s.aiRetryCount) ?? 0;
  const aiError = useGameStore((s) => s.aiError);
  const aiDecisionLog = useGameStore((s) => s.aiDecisionLog);
  const cancelAIRequest = useGameStore((s) => s.cancelAIRequest);
  const toggleAIAutoPlay = useGameStore((s) => s.toggleAIAutoPlay);
  const clearAIError = useGameStore((s) => s.clearAIError);

  const lastDecision =
    aiDecisionLog && aiDecisionLog.length > 0
      ? aiDecisionLog[aiDecisionLog.length - 1]
      : null;

  // Live elapsed-time counter, ticking once per second while thinking. The
  // interval callback (not the effect body) drives the updates; the display is
  // clamped to >= 0 so a momentarily stale `now` simply shows 0:00.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!aiThinking) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [aiThinking]);

  const elapsedMs = aiThinking && aiThinkingSince ? Math.max(0, now - aiThinkingSince) : 0;
  const timeoutSeconds = Math.round(AI_REQUEST_TIMEOUT_MS / 1000);

  return (
    <div
      data-testid="ai-advisor-panel"
      className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl w-full overflow-hidden"
    >
      <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between">
        <h3 className="text-lg font-bold">🤖 AI Advisor</h3>
        {aiAutoPlay && (
          <span
            data-testid="ai-auto-badge"
            className="text-[11px] font-bold bg-white/25 rounded px-2 py-0.5"
          >
            AUTO-PLAY
          </span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Auto-play idle beat (between moves) */}
        {aiAutoPlay && !aiThinking && (
          <div
            data-testid="ai-auto-indicator"
            className="bg-indigo-50 border border-indigo-200 rounded p-2 flex items-center justify-between"
          >
            <span className="text-xs font-semibold text-indigo-800">
              ⏳ Auto-play — next move queued…
            </span>
            <button
              data-testid="ai-auto-stop-btn"
              onClick={toggleAIAutoPlay}
              className="bg-indigo-200 hover:bg-indigo-300 text-indigo-900 font-semibold py-1 px-2 rounded text-xs"
            >
              Stop
            </button>
          </div>
        )}

        {/* Waiting indicator */}
        {aiThinking && (
          <div
            data-testid="ai-thinking-indicator"
            className="bg-indigo-50 border border-indigo-200 rounded p-3"
          >
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold text-indigo-800">
                {aiAutoPlay ? 'Auto-playing...' : 'Thinking...'}
              </span>
              <span
                data-testid="ai-elapsed"
                className="ml-auto text-sm font-mono font-bold text-indigo-700 tabular-nums"
              >
                {formatElapsed(elapsedMs)}
              </span>
            </div>
            <p className="text-xs text-indigo-700 mt-2">
              A thinking model can take a while, up to about{' '}
              {Math.round(timeoutSeconds / 60)} minutes on a hard board. The board is
              locked until it answers.
            </p>
            {aiRetryCount > 0 && (
              <p
                data-testid="ai-retry-count"
                className="text-xs font-semibold text-amber-700 mt-2"
              >
                Retries this request: {aiRetryCount}
              </p>
            )}
            {aiStatus && (
              <p data-testid="ai-status" className="text-xs text-amber-700 mt-1">
                {aiStatus}
              </p>
            )}
            <button
              data-testid="ai-cancel-btn"
              onClick={aiAutoPlay ? toggleAIAutoPlay : cancelAIRequest}
              className="mt-2 w-full bg-indigo-200 hover:bg-indigo-300 text-indigo-900 font-semibold py-1.5 px-3 rounded text-sm"
            >
              {aiAutoPlay ? 'Stop Auto-Play' : 'Cancel'}
            </button>
          </div>
        )}

        {/* Error */}
        {!aiThinking && aiError && (
          <div
            data-testid="ai-error"
            className="bg-red-50 border border-red-300 rounded p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-red-800 font-semibold">⚠️ {aiError}</p>
              <button
                data-testid="ai-error-dismiss-btn"
                onClick={clearAIError}
                className="text-red-400 hover:text-red-700 text-sm leading-none"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Last decision */}
        {!aiThinking && lastDecision && (
          <div data-testid="ai-last-decision" className="bg-gray-50 border border-gray-200 rounded p-3">
            <p className="text-sm font-semibold text-gray-800">{lastDecision.describe}</p>

            {/* Confidence block. Only rendered when the decision actually carries
                a confidence value (hybrid-v1.1 onwards drops it from the prompt;
                older saved sessions / replays may still have one). */}
            {lastDecision.confidence !== undefined && (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-gray-600">Confidence</span>
                  <span className="text-xs font-bold text-gray-700">
                    {Math.round(lastDecision.confidence * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${confidenceColor(lastDecision.confidence)}`}
                    style={{ width: `${Math.round(lastDecision.confidence * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <p
              data-testid="ai-reasoning"
              className="mt-2 text-xs text-gray-700 whitespace-pre-wrap break-words"
            >
              {lastDecision.reasoning}
            </p>

            {lastDecision.boardAnalysis && (
              <details className="mt-2">
                <summary className="text-[11px] font-semibold text-gray-500 cursor-pointer">
                  Board analysis
                </summary>
                <p
                  data-testid="ai-board-analysis"
                  className="mt-1 text-xs text-gray-600 whitespace-pre-wrap break-words"
                >
                  {lastDecision.boardAnalysis}
                </p>
              </details>
            )}

            {lastDecision.alternativeDescribe && (
              <p className="mt-2 text-xs text-gray-500">
                Alternative considered: {lastDecision.alternativeDescribe}
              </p>
            )}

            <p className="mt-2 text-[10px] text-gray-400 font-mono">
              {modelLabel(lastDecision.model)} · {new Date(lastDecision.timestamp).toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Idle hint */}
        {!aiThinking && !aiError && !lastDecision && (
          <p className="text-xs text-gray-500 text-center py-2">
            Use the “Ask AI” button to get a suggested move and its reasoning.
          </p>
        )}
      </div>
    </div>
  );
};

export default AIAdvisorPanel;
