import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Suit } from '../types';
import Card from './Card';
import { shouldReduceMotion as checkReducedMotion } from '../utils/motion';

interface FoundationPileProps {
  suit: Suit;
}

const FoundationPile: React.FC<FoundationPileProps> = ({ suit }) => {
  const foundation = useGameStore((state) => state.foundations[suit]);
  const selectedCard = useGameStore((state) => state.selectedCard);
  const moveCardToFoundation = useGameStore((state) => state.moveCardToFoundation);
  const canMoveToFoundation = useGameStore((state) => state.canMoveToFoundation);
  const showValidMoves = useGameStore((state) => state.showValidMoves);
  const replayMode = useGameStore((state) => state.replayMode);

  // Check for reduced motion preference
  const shouldReduceMotion = useMemo(() => checkReducedMotion(), []);

  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };

  const isRed = suit === 'hearts' || suit === 'diamonds';
  const color = isRed ? 'text-red-300' : 'text-gray-400';

  // Check if this foundation is a valid destination for the selected card
  const isValidDestination = showValidMoves && selectedCard && canMoveToFoundation(selectedCard.card, suit) && !replayMode;

  const handleClick = () => {
    if (replayMode) return;
    if (selectedCard && isValidDestination) {
      moveCardToFoundation(suit);
    }
  };

  // Animation variants for cards entering foundation
  const foundationVariants = shouldReduceMotion ? undefined : {
    initial: { 
      scale: 0.5,
      opacity: 0,
      y: -50
    },
    animate: { 
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 20,
        duration: 0.3
      }
    },
    exit: { 
      scale: 0.8,
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div data-testid={`foundation-${suit}`} className="relative w-20 h-28" onClick={handleClick}>
      <AnimatePresence mode="wait">
        {foundation.length > 0 ? (
          <motion.div 
            key={`foundation-${suit}-${foundation[foundation.length - 1].id}`}
            className="absolute inset-0"
            variants={foundationVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card card={{ ...foundation[foundation.length - 1], faceUp: true }} />
          </motion.div>
        ) : (
          <motion.div 
            key={`foundation-${suit}-empty`}
            className={`w-20 h-28 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-100 transition-all cursor-pointer ${color} ${
              isValidDestination
                ? 'border-cyan-500 bg-cyan-100 ring-4 ring-cyan-400 shadow-lg shadow-cyan-500/50'
                : 'border-gray-400 hover:border-gray-500'
            }`}
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-5xl">{suitSymbols[suit]}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Overlay for valid destination on non-empty foundation */}
      <AnimatePresence>
        {foundation.length > 0 && isValidDestination && (
          <motion.div 
            className="absolute inset-0 ring-4 ring-cyan-400 rounded-lg bg-cyan-200 bg-opacity-40 cursor-pointer z-10 shadow-lg shadow-cyan-500/50"
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FoundationPile;
