import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { shouldReduceMotion as checkReducedMotion } from '../utils/motion';
import { useMemo } from 'react';

const WinModal: React.FC = () => {
  const gameWon = useGameStore(state => state.gameWon);
  const initializeGame = useGameStore(state => state.initializeGame);
  const moveHistory = useGameStore(state => state.moveHistory);
  const difficulty = useGameStore(state => state.difficulty);
  const perceivedDifficulty = useGameStore(state => state.perceivedDifficulty);
  const shouldReduceMotion = useMemo(() => checkReducedMotion(), []);

  if (!gameWon) return null;

  // Calculate statistics
  const totalMoves = moveHistory.length;
  const difficultyLabels = ['Very Easy', 'Easy', 'Normal', 'Hard', 'Very Hard'];
  const difficultyLabel = difficultyLabels[difficulty - 1] || 'Normal';

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
      {gameWon && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
          >
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

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => initializeGame()}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200"
              >
                New Game
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WinModal;
