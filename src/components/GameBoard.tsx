import { motion } from 'framer-motion';
import { useMemo } from 'react';
import DrawPile from './DrawPile';
import DiscardPile from './DiscardPile';
import FoundationPile from './FoundationPile';
import TableauColumn from './TableauColumn';
import ControlPanel from './ControlPanel';
import ActivityLog from './ActivityLog';
import { shouldReduceMotion as checkReducedMotion } from '../utils/motion';

const GameBoard: React.FC = () => {
  // Check for reduced motion preference
  const shouldReduceMotion = useMemo(() => checkReducedMotion(), []);

  // Deal animation variants for tableau columns
  const dealVariants = shouldReduceMotion ? undefined : {
    hidden: { 
      opacity: 0, 
      y: -100 
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
        ease: "easeOut" as const
      }
    })
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-green-800">
      {/* Desktop: side panels, Mobile: stacked layout */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 p-2 sm:p-4 lg:p-6">
        
        {/* Left Panel - Activity Log (desktop: left side, mobile: top) */}
        <div className="lg:sticky lg:top-4 lg:w-80 flex-shrink-0 order-2 lg:order-1">
          <ActivityLog />
        </div>

        {/* Center - Game Area */}
        <div className="flex-1 min-w-0 order-1 lg:order-2">
          <div className="max-w-5xl mx-auto">
            <motion.h1 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-center mb-4 lg:mb-6"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: -20 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Solitaire
            </motion.h1>
            
            {/* Top Row: Draw Pile, Discard Pile, and Foundation Piles */}
            <motion.div 
              className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 lg:mb-8"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: -20 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <div className="flex gap-3 sm:gap-4">
                <DrawPile />
                <DiscardPile />
              </div>
              <div className="flex gap-3 sm:gap-4">
                <FoundationPile suit="hearts" />
                <FoundationPile suit="diamonds" />
                <FoundationPile suit="clubs" />
                <FoundationPile suit="spades" />
              </div>
            </motion.div>

            {/* Tableau: 7 columns */}
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-2 sm:gap-4 lg:gap-6 justify-center min-w-max px-2">
                {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                  <motion.div 
                    key={index} 
                    className="flex-shrink-0"
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    variants={dealVariants}
                  >
                    <TableauColumn columnIndex={index} />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Control Panel (desktop: right side, mobile: bottom) */}
        <div className="lg:sticky lg:top-4 lg:w-52 flex-shrink-0 order-3">
          <ControlPanel />
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
