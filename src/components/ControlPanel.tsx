import { useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Difficulty } from '../types';

const ControlPanel: React.FC = () => {
  const { exportGameState, importGameState, initializeGame, toggleValidMoves, toggleGodMode, toggleAutoPlay, setDifficulty } = useGameStore();
  const showValidMoves = useGameStore((state) => state.showValidMoves);
  const godMode = useGameStore((state) => state.godMode);
  const autoPlayEnabled = useGameStore((state) => state.autoPlayEnabled);
  const moveCount = useGameStore((state) => state.moveHistory.length);
  const difficulty = useGameStore((state) => state.difficulty);
  const perceivedDifficulty = useGameStore((state) => state.perceivedDifficulty);
  const completionProgress = useGameStore((state) => state.completionProgress);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = () => {
    const jsonState = exportGameState();
    const blob = new Blob([jsonState], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solitaire-game-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
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

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    initializeGame(newDifficulty);
    const difficultyNames = ['', 'Very Easy', 'Easy', 'Normal', 'Hard', 'Very Hard'];
    setMessage({ type: 'success', text: `Difficulty: ${difficultyNames[newDifficulty]}` });
    setTimeout(() => setMessage(null), 3000);
  };

  const getDifficultyLabel = (level: Difficulty): string => {
    const labels = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'];
    return labels[level];
  };

  const getDifficultyName = (level: Difficulty): string => {
    const names = ['', 'Very Easy', 'Easy', 'Normal', 'Hard', 'Very Hard'];
    return names[level];
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-4 w-full lg:w-52">
      <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Controls</h2>
      
      {/* Move Counter */}
      <div className="bg-green-600 text-white font-bold py-2 px-4 rounded text-center mb-4">
        <div className="text-sm">Moves</div>
        <div className="text-2xl">{moveCount}</div>
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
          onClick={handleNewGame}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
        >
          New Game
        </button>
        
        <button
          onClick={handleImport}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
        >
          Load Game
        </button>
        
        <button
          onClick={handleExport}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
        >
          Export Game
        </button>

        <div className="border-t border-gray-300 my-2"></div>
        
        <button
          onClick={toggleValidMoves}
          className={`w-full font-semibold py-2 px-4 rounded transition-colors text-sm ${
            showValidMoves
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
          }`}
        >
          {showValidMoves ? '✓' : '✗'} Valid Moves
        </button>
        
        <button
          onClick={toggleGodMode}
          className={`w-full font-semibold py-2 px-4 rounded transition-colors text-sm ${
            godMode
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
          }`}
        >
          {godMode ? '👁️' : '👁️‍🗨️'} God Mode
        </button>
        
        <button
          onClick={toggleAutoPlay}
          className={`w-full font-semibold py-2 px-4 rounded transition-colors text-sm ${
            autoPlayEnabled
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
          }`}
        >
          {autoPlayEnabled ? '⏸️' : '▶️'} Auto Play
        </button>
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
