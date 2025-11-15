import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import Card from './Card';
import { shouldReduceMotion as checkReducedMotion } from '../utils/motion';

const DiscardPile: React.FC = () => {
  const discardPile = useGameStore((state) => state.discardPile);
  const selectedCard = useGameStore((state) => state.selectedCard);
  const selectCard = useGameStore((state) => state.selectCard);
  const deselectCard = useGameStore((state) => state.deselectCard);
  const showValidMoves = useGameStore((state) => state.showValidMoves);
  const hasAnyValidDestination = useGameStore((state) => state.hasAnyValidDestination);
  const replayMode = useGameStore((state) => state.replayMode);

  // Check for reduced motion preference
  const shouldReduceMotion = useMemo(() => checkReducedMotion(), []);

  const handleCardClick = () => {
    if (replayMode || discardPile.length === 0) return;

    // If the top card is already selected, deselect it
    if (selectedCard?.source === 'discard') {
      deselectCard();
    } else {
      // Select the top card
      selectCard('discard');
    }
  };

  const isSelected = selectedCard?.source === 'discard';
  const isInteractable = discardPile.length > 0 && !selectedCard;
  
  const topCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
  const hasValidMoves = showValidMoves && !selectedCard && topCard !== null && 
    hasAnyValidDestination(topCard, 'discard');

  // Animation variants for cards entering discard pile
  const discardVariants = shouldReduceMotion ? undefined : {
    initial: { 
      x: -100,
      opacity: 0,
      rotateY: 180
    },
    animate: { 
      x: 0,
      opacity: 1,
      rotateY: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut" as const
      }
    },
    exit: { 
      scale: 0.8,
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div className="relative w-20 h-28">
      <AnimatePresence mode="wait">
        {discardPile.length > 0 ? (
          <motion.div 
            key={`discard-${discardPile[discardPile.length - 1].id}`}
            className="absolute inset-0"
            variants={discardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card
              card={{ ...discardPile[discardPile.length - 1], faceUp: true }}
              onClick={handleCardClick}
              isInteractable={isInteractable && !replayMode}
              isSelected={isSelected}
              hasValidMoves={hasValidMoves && !replayMode}
            />
          </motion.div>
        ) : (
          <motion.div 
            key="discard-empty"
            className="w-20 h-28 border-2 border-dashed border-gray-400 rounded-lg bg-gray-100"
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={shouldReduceMotion ? {} : { opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DiscardPile;
