import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import Card from './Card';
import { shouldReduceMotion as checkReducedMotion } from '../utils/motion';

interface TableauColumnProps {
  columnIndex: number;
}

const TableauColumn: React.FC<TableauColumnProps> = ({ columnIndex }) => {
  const column = useGameStore((state) => state.tableau[columnIndex]);
  const selectedCard = useGameStore((state) => state.selectedCard);
  const selectCard = useGameStore((state) => state.selectCard);
  const deselectCard = useGameStore((state) => state.deselectCard);
  const moveCardToTableau = useGameStore((state) => state.moveCardToTableau);
  const canMoveToTableau = useGameStore((state) => state.canMoveToTableau);
  const showValidMoves = useGameStore((state) => state.showValidMoves);
  const godMode = useGameStore((state) => state.godMode);
  const hasAnyValidDestination = useGameStore((state) => state.hasAnyValidDestination);

  // Check for reduced motion preference
  const shouldReduceMotion = useMemo(() => checkReducedMotion(), []);

  // Check if this column is a valid destination for the selected card
  const isValidDestination = showValidMoves && selectedCard && canMoveToTableau(selectedCard.card, columnIndex);

  const handleCardClick = (cardIndex: number) => {
    const card = column[cardIndex];
    
    // If a card is already selected
    if (selectedCard) {
      // If clicking the same card, deselect it
      if (
        selectedCard.source === 'tableau' &&
        selectedCard.columnIndex === columnIndex &&
        selectedCard.cardIndex === cardIndex
      ) {
        deselectCard();
      } else {
        // Try to move to this column
        moveCardToTableau(columnIndex);
      }
    } else {
      // Select this card if it's face up
      if (card.faceUp) {
        selectCard('tableau', columnIndex, cardIndex);
      }
    }
  };

  const handleEmptyColumnClick = () => {
    if (selectedCard) {
      moveCardToTableau(columnIndex);
    }
  };

  // Calculate the height needed for the column based on number of cards
  // Each card adds 32px vertical offset, plus we need full card height (112px) for the last card
  const columnHeight = column.length > 0 ? column.length * 32 + 80 : 128;

  // Animation variants for card placement
  const cardVariants = shouldReduceMotion ? undefined : {
    initial: { 
      scale: 0.8, 
      opacity: 0,
      y: -20
    },
    animate: { 
      scale: 1, 
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 500,
        damping: 25,
        duration: 0.25
      }
    },
    exit: { 
      scale: 0.8, 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div className="relative w-20" style={{ minHeight: `${columnHeight}px` }}>
      {column.length > 0 ? (
        <div className="relative">
          <AnimatePresence mode="popLayout">
            {column.map((card, index) => {
              const isSelected =
                selectedCard?.source === 'tableau' &&
                selectedCard.columnIndex === columnIndex &&
                selectedCard.cardIndex === index;
              
              // A card is interactable if it's face up and no card is currently selected
              const isInteractable = card.faceUp && !selectedCard;
              
              // Check if this card has valid destinations (only if showValidMoves is enabled and no card selected)
              const hasValidMoves = showValidMoves && !selectedCard && card.faceUp && 
                hasAnyValidDestination(card, 'tableau', columnIndex, index);
              
              return (
                <motion.div
                  key={card.id}
                  className="absolute"
                  style={{ top: `${index * 32}px` }}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout={!shouldReduceMotion}
                  transition={shouldReduceMotion ? { duration: 0 } : { 
                    layout: { 
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      duration: 0.25
                    }
                  }}
                >
                  <Card
                    card={card}
                    onClick={() => handleCardClick(index)}
                    isInteractable={isInteractable}
                    isSelected={isSelected}
                    hasValidMoves={hasValidMoves}
                    godMode={godMode}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          onClick={handleEmptyColumnClick}
          className={`w-20 h-28 border-2 border-dashed rounded-lg bg-gray-100 cursor-pointer transition-all ${
            isValidDestination
              ? 'border-cyan-500 bg-cyan-100 ring-4 ring-cyan-400 shadow-lg shadow-cyan-500/50'
              : 'border-gray-400 hover:border-gray-500'
          }`}
          whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
          transition={{ duration: 0.2 }}
        />
      )}
      {/* Overlay for valid destination on non-empty columns */}
      {column.length > 0 && isValidDestination && (
        <motion.div
          onClick={() => moveCardToTableau(columnIndex)}
          className="absolute inset-0 ring-4 ring-cyan-400 rounded-lg bg-cyan-200 bg-opacity-40 cursor-pointer pointer-events-auto z-10 shadow-lg shadow-cyan-500/50"
          style={{ top: 0, height: `${column.length * 32 + 112}px` }}
          initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
          exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </div>
  );
};

export default TableauColumn;
