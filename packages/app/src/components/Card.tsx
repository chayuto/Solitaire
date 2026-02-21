import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { Card as CardType } from '../types';
import { shouldReduceMotion as checkReducedMotion } from '../utils/motion';

/**
 * Props for the Card component
 */
interface CardProps {
  /** The card data to display */
  card: CardType;
  /** Optional click handler for card interaction */
  onClick?: () => void;
  /** Whether the card can be interacted with (shows cyan ring) */
  isInteractable?: boolean;
  /** Whether the card is currently selected (shows yellow ring) */
  isSelected?: boolean;
  /** Whether the card has valid moves available (shows green ring) */
  hasValidMoves?: boolean;
  /** God mode reveals face-down cards with reduced opacity */
  godMode?: boolean;
}

/**
 * Card component - Displays a playing card with animations and visual states
 * Handles both face-up and face-down card rendering, with special god mode visualization
 */
const Card: React.FC<CardProps> = ({ card, onClick, isInteractable = false, isSelected = false, hasValidMoves = false, godMode = false }) => {
  const { suit, rank, faceUp } = card;

  // Check for reduced motion preference
  const shouldReduceMotion = useMemo(() => checkReducedMotion(), []);

  // Determine if the card is red or black
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const color = isRed ? 'text-red-600' : 'text-black';

  // Suit symbols
  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };

  // Build className for highlighting
  const getHighlightClass = () => {
    if (isSelected) {
      return 'ring-4 ring-yellow-400 scale-105';
    }
    if (hasValidMoves) {
      return 'ring-2 ring-red-400 hover:ring-4 hover:ring-red-500';
    }
    if (isInteractable) {
      return 'ring-2 ring-cyan-400 hover:ring-4 hover:ring-cyan-500';
    }
    return '';
  };

  // Animation variants for flip
  const flipVariants = shouldReduceMotion ? undefined : {
    faceDown: { rotateY: 180 },
    faceUp: { rotateY: 0 }
  };

  // Animation variants for hover and selection
  const hoverVariants = shouldReduceMotion ? undefined : {
    hover: { 
      scale: 1.05,
      y: -4,
      transition: { duration: 0.2 }
    }
  };

  const transition = shouldReduceMotion 
    ? { duration: 0 }
    : { duration: 0.3 };

  if (!faceUp) {
    // God mode: show card with reduced opacity to reveal content
    if (godMode) {
      return (
        <motion.div 
          data-testid={`card-${card.id}`}
          data-card-suit={suit}
          data-card-rank={rank}
          data-card-faceup="false"
          className="relative"
          initial={shouldReduceMotion ? undefined : "faceDown"}
          animate={shouldReduceMotion ? undefined : "faceDown"}
          variants={flipVariants}
          transition={transition}
          style={shouldReduceMotion ? undefined : { transformStyle: 'preserve-3d' }}
        >
          <motion.div
            onClick={onClick}
            className={`w-20 h-28 bg-white border-2 border-gray-300 rounded-lg flex flex-col p-2 cursor-pointer shadow-md select-none ${color} ${getHighlightClass()} opacity-40`}
            whileHover={isInteractable && !shouldReduceMotion ? "hover" : undefined}
            variants={hoverVariants}
          >
            <div className="flex justify-between items-start">
              <div className="text-xl font-bold leading-none">{rank}</div>
              <div className="text-2xl leading-none">{suitSymbols[suit]}</div>
            </div>
            <div className="flex-1"></div>
            <div className="flex justify-between items-end rotate-180">
              <div className="text-xl font-bold leading-none">{rank}</div>
              <div className="text-2xl leading-none">{suitSymbols[suit]}</div>
            </div>
          </motion.div>
          {/* Indicator badge for god mode */}
          <div className="absolute top-1 right-1 text-xs pointer-events-none">
            👁️
          </div>
        </motion.div>
      );
    }
    
    return (
      <motion.div
        data-testid={`card-${card.id}`}
        data-card-suit={suit}
        data-card-rank={rank}
        data-card-faceup="false"
        onClick={onClick}
        className={`w-20 h-28 bg-blue-900 border-2 border-blue-700 rounded-lg flex items-center justify-center cursor-pointer shadow-md select-none ${getHighlightClass()}`}
        initial={shouldReduceMotion ? undefined : "faceDown"}
        animate={shouldReduceMotion ? undefined : "faceDown"}
        variants={flipVariants}
        transition={transition}
        style={shouldReduceMotion ? undefined : { transformStyle: 'preserve-3d' }}
        whileHover={isInteractable && !shouldReduceMotion ? "hover" : undefined}
      >
        <div className="text-blue-700 text-4xl font-bold">🂠</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      data-testid={`card-${card.id}`}
      data-card-suit={suit}
      data-card-rank={rank}
      data-card-faceup="true"
      onClick={onClick}
      className={`w-20 h-28 bg-white border-2 border-gray-300 rounded-lg flex flex-col p-2 cursor-pointer shadow-md select-none ${color} ${getHighlightClass()}`}
      initial={shouldReduceMotion ? undefined : "faceUp"}
      animate={shouldReduceMotion ? undefined : (isSelected ? { scale: 1.05 } : "faceUp")}
      variants={flipVariants}
      transition={transition}
      style={shouldReduceMotion ? undefined : { transformStyle: 'preserve-3d' }}
      whileHover={isInteractable && !shouldReduceMotion ? "hover" : undefined}
    >
      <div className="flex justify-between items-start">
        <div className="text-xl font-bold leading-none">{rank}</div>
        <div className="text-2xl leading-none">{suitSymbols[suit]}</div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-4xl">{suitSymbols[suit]}</div>
      </div>
      <div className="flex justify-between items-end rotate-180">
        <div className="text-xl font-bold leading-none">{rank}</div>
        <div className="text-2xl leading-none">{suitSymbols[suit]}</div>
      </div>
    </motion.div>
  );
};

export default Card;
