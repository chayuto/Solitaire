import { useGameStore } from '../store/gameStore';
import { summarizeHistoryMove } from '../ai';

/**
 * ReplayControls component - Controls for replay mode
 * Provides UI for:
 * - Play/Pause replay
 * - Step forward/backward
 * - Progress bar showing current position
 * - Speed control
 * - Exit replay mode
 */
const ReplayControls: React.FC = () => {
  const replayMode = useGameStore((state) => state.replayMode);
  const replayIndex = useGameStore((state) => state.replayIndex);
  const replayPaused = useGameStore((state) => state.replayPaused);
  const replaySpeed = useGameStore((state) => state.replaySpeed);
  const moveHistory = useGameStore((state) => state.moveHistory);
  const {
    pauseReplay,
    resumeReplay,
    stopReplay,
    stepForward,
    stepBackward,
    setReplaySpeed,
    goToReplayIndex,
  } = useGameStore();

  // Don't render if not in replay mode
  if (!replayMode) return null;

  const totalMoves = moveHistory.length;
  const progressPercentage = totalMoves > 0 ? (replayIndex / totalMoves) * 100 : 0;
  const isAtStart = replayIndex === 0;
  const isAtEnd = replayIndex >= totalMoves;

  // The move that was just applied at the current replay position.
  const currentMove = replayIndex > 0 ? moveHistory[replayIndex - 1] : undefined;
  const currentIsAIMove =
    currentMove?.aiMove === true || typeof currentMove?.aiReasoning === 'string';

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newIndex = Math.round(percentage * totalMoves);
    goToReplayIndex(newIndex);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setReplaySpeed(Number(e.target.value));
  };

  return (
    <div data-testid="replay-controls" className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-800">🎬 Replay Mode</h3>
        <button
          data-testid="replay-exit-btn"
          onClick={stopReplay}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition-colors text-sm"
        >
          Exit Replay
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span data-testid="replay-progress" className="text-sm font-semibold text-gray-700">
            Move {replayIndex} / {totalMoves}
          </span>
          <span className="text-xs text-gray-600">
            {progressPercentage.toFixed(1)}%
          </span>
        </div>
        <div
          data-testid="replay-progress-bar"
          className="w-full bg-gray-200 rounded-full h-3 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Current move, with the AI marker and reasoning when AI-played */}
      {currentMove && (
        <div
          data-testid="replay-current-move"
          className={`mb-3 text-sm rounded p-2 border ${
            currentIsAIMove
              ? 'bg-indigo-50 border-indigo-300'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className={currentIsAIMove ? 'text-indigo-900' : 'text-gray-800'}>
            {currentIsAIMove && (
              <span className="mr-1" aria-label="AI move">
                🤖
              </span>
            )}
            {summarizeHistoryMove(currentMove)}
          </div>
          {currentIsAIMove && (
            <div
              data-testid="replay-ai-reasoning"
              className="mt-1 text-xs italic text-indigo-700"
            >
              {currentMove.aiConfidence !== undefined && (
                <span className="not-italic font-semibold">
                  [{Math.round(currentMove.aiConfidence * 100)}%]{' '}
                </span>
              )}
              {currentMove.aiReasoning}
            </div>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <button
          data-testid="replay-back-btn"
          onClick={stepBackward}
          disabled={isAtStart}
          className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
          title="Step Backward"
        >
          ⏮️ Back
        </button>
        
        {replayPaused || isAtEnd ? (
          <button
            data-testid="replay-play-btn"
            onClick={isAtEnd ? () => {
              goToReplayIndex(0);
              resumeReplay();
            } : resumeReplay}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition-colors text-sm"
            title={isAtEnd ? "Restart" : "Play"}
          >
            {isAtEnd ? '🔄 Restart' : '▶️ Play'}
          </button>
        ) : (
          <button
            data-testid="replay-play-btn"
            onClick={pauseReplay}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded transition-colors text-sm"
            title="Pause"
          >
            ⏸️ Pause
          </button>
        )}
        
        <button
          data-testid="replay-forward-btn"
          onClick={stepForward}
          disabled={isAtEnd}
          className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
          title="Step Forward"
        >
          Forward ⏭️
        </button>
      </div>

      {/* Speed Control */}
      <div className="flex items-center justify-center gap-2">
        <label htmlFor="replay-speed" className="text-sm font-semibold text-gray-700">
          Speed:
        </label>
        <select
          id="replay-speed"
          data-testid="replay-speed-select"
          value={replaySpeed}
          onChange={handleSpeedChange}
          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={2000}>0.5x (Slow)</option>
          <option value={1000}>1x (Normal)</option>
          <option value={500}>2x (Fast)</option>
          <option value={250}>4x (Very Fast)</option>
        </select>
      </div>
    </div>
  );
};

export default ReplayControls;
