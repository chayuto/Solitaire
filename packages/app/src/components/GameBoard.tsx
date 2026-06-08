import { motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import DrawPile from './DrawPile';
import DiscardPile from './DiscardPile';
import FoundationPile from './FoundationPile';
import TableauColumn from './TableauColumn';
import ControlPanel from './ControlPanel';
import GameInsightsPanel from './GameInsightsPanel';
import ActivityLog from './ActivityLog';
import AIAdvisorPanel from './AIAdvisorPanel';
import AIKeyModal from './AIKeyModal';
import WinModal from './WinModal';
import SessionManagerModal from './SessionManagerModal';
import ReplayControls from './ReplayControls';
import { shouldReduceMotion as checkReducedMotion } from '../utils/motion';
import { useUnloadGuard } from '../hooks/useUnloadGuard';
import { DEFAULT_AI_CONFIG } from '../ai';
import { getEffectiveKey } from '../ai/keyStore';
import { modelEmoji } from '../utils/modelLabel';

const GameBoard: React.FC = () => {
  // Check for reduced motion preference
  const shouldReduceMotion = useMemo(() => checkReducedMotion(), []);

  // Warn before an accidental navigation discards an unfinished game.
  useUnloadGuard();

  // Short game identifier: the seed (when the deal was seeded) and the last 6
  // characters of the session UUID. Shown under the title and in the tab.
  const gameSessionId = useGameStore((s) => s.gameSessionId);
  const seed = useGameStore((s) => s.seed);
  const shortId = gameSessionId ? gameSessionId.slice(-6) : null;
  const gameLabel = shortId
    ? `#${shortId}${seed !== undefined ? ` · seed ${seed}` : ''}`
    : null;

  // Tab-title status flag, so many unattended tabs can be triaged at a glance:
  //  🏆 game won · ⚠️ AI stopped and needs attention · 🤖 AI on.
  // "AI on" = an API key is available for this tab (env fallback or a saved
  // key). When on, we append just the model's colour emoji (no name — tab
  // space is tight; see modelEmoji) so several tabs each running a different
  // model can be told apart from the tab strip alone, even while idle.
  const gameWon = useGameStore((s) => s.gameWon);
  const aiError = useGameStore((s) => s.aiError);
  const aiThinking = useGameStore((s) => s.aiThinking);
  const aiAutoPlay = useGameStore((s) => s.aiAutoPlay);
  const aiConfig = useGameStore((s) => s.aiConfig) ?? DEFAULT_AI_CONFIG;
  // Re-read the effective key whenever the key modal opens/closes so a freshly
  // saved or cleared key is reflected in the tab title without a reload.
  const aiKeyModalOpen = useGameStore((s) => s.aiKeyModalOpen);
  void aiKeyModalOpen;
  const aiOn = Boolean(getEffectiveKey(aiConfig.provider));
  const aiStopped = Boolean(aiError) && !aiThinking && !aiAutoPlay;
  // The model tag carries its own trailing space so the prefix omits it cleanly
  // when no model is known.
  const modelTag = aiOn && aiConfig.model ? `${modelEmoji(aiConfig.model)} ` : '';
  const titlePrefix = gameWon
    ? '🏆 '
    : aiStopped
      ? `⚠️ ${modelTag}`
      : aiOn
        ? `🤖 ${modelTag}`
        : '';

  useEffect(() => {
    const base = gameLabel ? `Solitaire ${gameLabel}` : 'Solitaire';
    document.title = `${titlePrefix}${base}`;
  }, [titlePrefix, gameLabel]);

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
    <div data-testid="game-board" className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-green-800">
      <WinModal />
      <AIKeyModal />
      <SessionManagerModal />

      {/* Desktop: side panels, Mobile: stacked layout */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 p-2 sm:p-4 lg:p-6">

        {/* Left Panel - Activity Log + AI Advisor (desktop: left side, mobile: top) */}
        <div className="lg:sticky lg:top-4 lg:w-80 flex-shrink-0 order-2 lg:order-1 flex flex-col gap-4">
          <ActivityLog />
          <AIAdvisorPanel />
        </div>

        {/* Center - Game Area */}
        <div className="flex-1 min-w-0 order-1 lg:order-2">
          <div className="max-w-5xl mx-auto">
            <motion.div
              className="text-center mb-4 lg:mb-6"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: -20 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                Solitaire
              </h1>
              {gameLabel && (
                <p
                  data-testid="game-id"
                  className="text-xs sm:text-sm font-mono text-green-200/80 mt-0.5"
                >
                  Game {gameLabel}
                </p>
              )}
            </motion.div>

            {/* Replay Controls */}
            <ReplayControls />
            
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

            {/* Live progress dashboard — charts the game / AI auto-play */}
            <GameInsightsPanel />
          </div>
        </div>

        {/* Right Panel - Control Panel (desktop: right side, mobile: bottom) */}
        <div className="lg:sticky lg:top-4 lg:w-52 flex-shrink-0 order-3">
          <ControlPanel />
        </div>
      </div>

      {/* Build Info - subtle footer */}
      <div className="fixed bottom-2 right-2 text-[10px] text-green-200/40 font-mono select-none pointer-events-none">
        <div>v{__COMMIT_HASH__}</div>
      </div>
    </div>
  );
};

export default GameBoard;
