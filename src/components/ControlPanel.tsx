import { useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

const ControlPanel: React.FC = () => {
  const { exportGameState, importGameState, initializeGame } = useGameStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = () => {
    const jsonState = exportGameState();
    const blob = new Blob([jsonState], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solitaire-save-${Date.now()}.json`;
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

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-4 w-48">
      <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Controls</h2>
      
      <div className="space-y-2">
        <button
          onClick={handleNewGame}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          New Game
        </button>
        
        <button
          onClick={handleImport}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Load Game
        </button>
        
        <button
          onClick={handleExport}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Save Game
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
