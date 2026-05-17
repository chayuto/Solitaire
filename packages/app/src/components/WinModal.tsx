import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { shouldReduceMotion as checkReducedMotion } from '../utils/motion';
import { downloadJson, gameIdTag } from '../utils/download';
import { useMemo } from 'react';

const WinModal: React.FC = () => {
  const gameWon = useGameStore(state => state.gameWon);
  const winModalDismissed = useGameStore(state => state.winModalDismissed) ?? false;
  const initializeGame = useGameStore(state => state.initializeGame);
  const dismissWinModal = useGameStore(state => state.dismissWinModal);
  const exportGameState = useGameStore(state => state.exportGameState);
  const exportAIInteractions = useGameStore(state => state.exportAIInteractions);
  const gameSessionId = useGameStore(state => state.gameSessionId);
  const moveHistory = useGameStore(state => state.moveHistory);
  const difficulty = useGameStore(state => state.difficulty);
  const perceivedDifficulty = useGameStore(state => state.perceivedDifficulty);
  const shouldReduceMotion = useMemo(() => checkReducedMotion(), []);

  const showModal = gameWon && !winModalDismissed;
  if (!showModal) return null;

  // Calculate statistics
  const totalMoves = moveHistory.length;
  const difficultyLabels = ['Very Easy', 'Easy', 'Normal', 'Hard', 'Very Hard'];
  const difficultyLabel = difficultyLabels[difficulty - 1] || 'Normal';
  const idTag = gameIdTag(gameSessionId);

  const handleExportGame = () => {
    downloadJson(`solitaire-win-${idTag}${Date.now()}.json`, exportGameState());
  };

  const handleExportAILog = () => {
    downloadJson(`solitaire-ai-log-${idTag}${Date.now()}.json`, exportAIInteractions());
  };

  const backdropVariants = shouldReduceMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = shouldReduceMotion ? undefined : {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: -50,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 15,
        stiffness: 300,
      }
    },
  };

  const celebrationVariants = shouldReduceMotion ? undefined : {
    animate: {
      rotate: [0, 10, -10, 10, -10, 0],
      scale: [1, 1.1, 1, 1.1, 1],
      transition: {
        duration: 0.5,
        repeat: Infinity,
        repeatDelay: 1,
      }
    }
  };

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            data-testid="win-modal"
            className="relative bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Dismiss without starting a new game, so the won game can still
                be exported from the controls. */}
            <button
              data-testid="win-modal-close-btn"
              onClick={dismissWinModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>

            <motion.div
              className="text-6xl mb-4"
              variants={celebrationVariants}
              animate="animate"
            >
              🎉
            </motion.div>

            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
              Congratulations!
            </h2>

            <p className="text-lg text-gray-600 mb-6">
              You've successfully completed the game! All cards are in the foundations.
            </p>

            {/* Game Statistics */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Game Statistics</h3>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Moves:</span>
                <span className="text-xl font-bold text-green-600">{totalMoves}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Difficulty:</span>
                <span className="text-lg font-semibold text-gray-800">{difficultyLabel}</span>
              </div>

              {perceivedDifficulty !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Board Difficulty:</span>
                  <span className="text-lg font-semibold text-gray-800">{perceivedDifficulty}/100</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                data-testid="win-export-game-btn"
                onClick={handleExportGame}
                className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 text-sm"
              >
                Export Game
              </button>
              <button
                data-testid="win-export-ai-log-btn"
                onClick={handleExportAILog}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 text-sm"
              >
                Export AI Log
              </button>
              <button
                data-testid="win-new-game-btn"
                onClick={() => initializeGame()}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 text-sm"
              >
                New Game
              </button>
            </div>

            <button
              data-testid="win-dismiss-btn"
              onClick={dismissWinModal}
              className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Close and keep this game
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WinModal;
