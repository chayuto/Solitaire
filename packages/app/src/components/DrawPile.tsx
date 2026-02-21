import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import Card from './Card';
import { shouldReduceMotion as checkReducedMotion } from '../utils/motion';

const DrawPile: React.FC = () => {
  const drawPile = useGameStore((state) => state.drawPile);
  const drawCard = useGameStore((state) => state.drawCard);
  const godMode = useGameStore((state) => state.godMode);
  const replayMode = useGameStore((state) => state.replayMode);

  // Check for reduced motion preference
  const shouldReduceMotion = useMemo(() => checkReducedMotion(), []);

  // Animation for drawing card
  const drawVariants = shouldReduceMotion ? undefined : {
    initial: { 
      x: 0,
      opacity: 1
    },
    exit: { 
      x: 100,
      opacity: 0,
      transition: { duration: 0.25 }
    }
  };

  return (
    <motion.div 
      data-testid="draw-pile"
      className={`relative w-20 h-28 ${replayMode ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
      onClick={replayMode ? undefined : drawCard}
      whileHover={shouldReduceMotion || replayMode ? {} : { scale: 1.05 }}
      whileTap={shouldReduceMotion || replayMode ? {} : { scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <AnimatePresence mode="wait">
        {drawPile.length > 0 ? (
          <motion.div 
            key={`draw-pile-${drawPile[0].id}`}
            className="absolute inset-0"
            variants={drawVariants}
            initial="initial"
            exit="exit"
          >
            <Card card={{ ...drawPile[0], faceUp: false }} godMode={godMode} />
          </motion.div>
        ) : (
          <motion.div 
            key="draw-pile-empty"
            className="w-20 h-28 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center bg-gray-100"
            initial={shouldReduceMotion ? {} : { rotate: 0 }}
            whileHover={shouldReduceMotion ? {} : { rotate: 180 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-gray-400 text-2xl">↻</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DrawPile;
