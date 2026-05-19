import { useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Difficulty } from '../types';
import { downloadJson, gameIdTag } from '../utils/download';
import AISettingsSection from './AISettingsSection';

/**
 * ControlPanel component - Main game controls and settings
 * Provides UI for:
 * - Move counter display
 * - Game metrics (perceived difficulty, completion progress)
 * - Difficulty selector
 * - New game, save/load game state
 * - Toggle features (valid moves, god mode, auto-play)
 */
const ControlPanel: React.FC = () => {
  const { exportGameState, importGameState, initializeGame, toggleValidMoves, toggleGodMode, toggleAutoPlay, setDifficulty, startReplay, askAIForMove, toggleAIAutoPlay } = useGameStore();
  const setSessionManagerOpen = useGameStore((state) => state.setSessionManagerOpen);
  const showValidMoves = useGameStore((state) => state.showValidMoves);
  const godMode = useGameStore((state) => state.godMode);
  const autoPlayEnabled = useGameStore((state) => state.autoPlayEnabled);
  const replayMode = useGameStore((state) => state.replayMode);
  const aiThinking = useGameStore((state) => state.aiThinking);
  const aiAutoPlay = useGameStore((state) => state.aiAutoPlay);
  const gameWon = useGameStore((state) => state.gameWon);
  const gameSessionId = useGameStore((state) => state.gameSessionId);
  const seed = useGameStore((state) => state.seed);
  const moveCount = useGameStore((state) => state.moveHistory.length);
  const difficulty = useGameStore((state) => state.difficulty);
  const perceivedDifficulty = useGameStore((state) => state.perceivedDifficulty);
  const completionProgress = useGameStore((state) => state.completionProgress);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = () => {
    downloadJson(`solitaire-game-${gameIdTag(gameSessionId)}${Date.now()}.json`, exportGameState());
    setMessage({ type: 'success', text: 'Game exported successfully!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = importGameState(content);
      
      if (success) {
        setMessage({ type: 'success', text: 'Game loaded successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Invalid game file format!' });
      }
      
      setTimeout(() => setMessage(null), 3000);
    };
    
    reader.readAsText(file);
    
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNewGame = () => {
    initializeGame();
    setMessage({ type: 'success', text: 'New game started!' });
    setTimeout(() => setMessage(null), 3000);
  };

  /**
   * Open an independent game session in a new window — same seed (so the same
   * board, when seeded) and difficulty — for running models in parallel. The
   * new window gets its own session id; the API key carries over via the
   * copied sessionStorage.
   */
  const handleParallelSession = () => {
    const params = new URLSearchParams();
    if (seed !== undefined) params.set('seed', String(seed));
    params.set('difficulty', String(difficulty));
    // `fork=1` tells the new tab it is a fresh Parallel Window: it must start
    // its own saved session and ignore the sessionStorage copied from this
    // tab, so the two boards autosave independently without clobbering.
    params.set('fork', '1');
    window.open(`${window.location.pathname}?${params.toString()}`, '_blank');
    setMessage({
      type: 'success',
      text: seed !== undefined ? 'Parallel session opened (same board).' : 'Parallel session opened.',
    });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    initializeGame(newDifficulty);
    const difficultyNames = ['', 'Very Easy', 'Easy', 'Normal', 'Hard', 'Very Hard'];
    setMessage({ type: 'success', text: `Difficulty: ${difficultyNames[newDifficulty]}` });
    setTimeout(() => setMessage(null), 3000);
  };

  const getDifficultyLabel = (level: Difficulty): string => {
    return level.toString();
  };

  const getDifficultyName = (level: Difficulty): string => {
    const names = ['', 'Very Easy', 'Easy', 'Normal', 'Hard', 'Very Hard'];
    return names[level];
  };

  return (
    <div data-testid="control-panel" className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-4 w-full lg:w-52">
      <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Controls</h2>
      
      {/* Move Counter */}
      <div data-testid="move-counter" className="bg-green-600 text-white font-bold py-2 px-4 rounded text-center mb-4">
        <div className="text-sm">Moves</div>
        <div data-testid="move-count" className="text-2xl">{moveCount}</div>
      </div>

      {/* Metrics Display */}
      <div className="space-y-2 mb-4">
        {/* Completion Progress */}
        <div className="bg-blue-50 rounded p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-gray-700">Completion</span>
            <span className="text-xs font-bold text-blue-700">{completionProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionProgress}%` }}
            />
          </div>
        </div>

        {/* Perceived Difficulty */}
        {perceivedDifficulty !== undefined && (
          <div className="bg-orange-50 rounded p-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-700">Board Difficulty</span>
              <span className="text-xs font-bold text-orange-700">{perceivedDifficulty}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  perceivedDifficulty < 30 ? 'bg-green-500' :
                  perceivedDifficulty < 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${perceivedDifficulty}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Difficulty Selector */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
          Difficulty: {getDifficultyName(difficulty)}
        </label>
        <div className="flex justify-between gap-1">
          {([1, 2, 3, 4, 5] as Difficulty[]).map((level) => (
            <button
              key={level}
              data-testid={`difficulty-btn-${level}`}
              onClick={() => handleDifficultyChange(level)}
              className={`flex-1 py-2 px-1 rounded text-xs font-semibold transition-colors ${
                difficulty === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title={getDifficultyName(level)}
            >
              {getDifficultyLabel(level)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <button
          data-testid="new-game-btn"
          onClick={handleNewGame}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
        >
          New Game
        </button>

        <button
          data-testid="session-manager-btn"
          onClick={() => setSessionManagerOpen(true)}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
          title="Browse, resume, or delete games saved automatically in this browser"
        >
          📂 Saved Games
        </button>

        <button
          data-testid="parallel-session-btn"
          onClick={handleParallelSession}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
          title="Open an independent session in a new window (same board) to run models in parallel"
        >
          🔀 Parallel Window
        </button>

        <button
          data-testid="import-btn"
          onClick={handleImport}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
        >
          Load Game
        </button>
        
        <button
          data-testid="export-btn"
          onClick={handleExport}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
        >
          Export Game
        </button>

        {moveCount > 0 && !replayMode && (
          <button
            data-testid="replay-btn"
            onClick={startReplay}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
          >
            🎬 Start Replay
          </button>
        )}

        <div className="border-t border-gray-300 my-2"></div>
        
        <button
          data-testid="valid-moves-btn"
          onClick={toggleValidMoves}
          disabled={replayMode}
          className={`w-full font-semibold py-2 px-4 rounded transition-colors text-sm ${
            showValidMoves
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
          } ${replayMode ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {showValidMoves ? '✓' : '✗'} Valid Moves
        </button>
        
        <button
          data-testid="god-mode-btn"
          onClick={toggleGodMode}
          disabled={replayMode}
          className={`w-full font-semibold py-2 px-4 rounded transition-colors text-sm ${
            godMode
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
          } ${replayMode ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {godMode ? '👁️' : '👁️‍🗨️'} God Mode
        </button>
        
        <button
          data-testid="auto-play-btn"
          onClick={toggleAutoPlay}
          disabled={replayMode || aiAutoPlay}
          className={`w-full font-semibold py-2 px-4 rounded transition-colors text-sm ${
            autoPlayEnabled
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
          } ${replayMode || aiAutoPlay ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {autoPlayEnabled ? '⏸️' : '▶️'} Auto Play
        </button>

        <div className="border-t border-gray-300 my-2"></div>

        <button
          data-testid="ask-ai-btn"
          onClick={() => { void askAIForMove(); }}
          disabled={replayMode || autoPlayEnabled || gameWon || aiThinking || aiAutoPlay}
          className={`w-full font-semibold py-2 px-4 rounded transition-colors text-sm ${
            aiThinking && !aiAutoPlay
              ? 'bg-indigo-400 text-white cursor-wait'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          } ${
            replayMode || autoPlayEnabled || gameWon || aiAutoPlay
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
          title="Ask an LLM for the next best move"
        >
          {aiThinking && !aiAutoPlay ? '🤖 Thinking…' : '🤖 Ask AI'}
        </button>

        <button
          data-testid="ai-auto-play-btn"
          onClick={toggleAIAutoPlay}
          disabled={replayMode || autoPlayEnabled || gameWon}
          className={`w-full font-semibold py-2 px-4 rounded transition-colors text-sm ${
            aiAutoPlay
              ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
          } ${
            replayMode || autoPlayEnabled || gameWon ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title="Let the AI keep playing the whole game move-by-move"
        >
          {aiAutoPlay ? '⏹️ Stop AI Auto' : '🤖 AI Auto-Play'}
        </button>

        <AISettingsSection />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {message && (
        <div className={`mt-4 p-2 rounded text-sm text-center ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
