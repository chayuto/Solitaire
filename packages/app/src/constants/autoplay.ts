/**
 * Auto-play configuration constants for Solitaire
 * Centralizes all magic numbers used in move scoring and timing
 * 
 * @public
 * AI agents: Safe to modify scoring values to tune strategy
 */

/**
 * Scoring configuration for auto-play move evaluation
 * Higher scores = more desirable moves
 * 
 * Priority levels:
 * - Priority #1: Unlock Tableau (1000000+ points)
 * - Priority #2: King Management (100000+ points)
 * - Priority #3: Foundation Handling (10000+ points)
 * - Priority #4: Draw Pile Management (1000+ points)
 * - Priority #5: Flexibility (100+ points)
 */
export const AUTOPLAY_SCORING = {
  // Priority #1: Unlock the Tableau
  REVEAL_CARD_BONUS: 1000000,
  REVEAL_BASE_BONUS: 100000,
  FACE_DOWN_PRIORITY_MULTIPLIER: 50000,
  REVEAL_VALUE_SCALE: 100,
  NO_REVEAL_BASE: 2000,
  USELESS_SINGLE_MOVE_PENALTY: 10000,
  
  // Priority #2: King Management
  KING_TO_EMPTY_BONUS: 100000,
  KING_FACE_DOWN_MULTIPLIER: 10000,
  KING_UNBLOCKS_QUEEN_BONUS: 20000,
  NON_KING_TO_EMPTY_PENALTY: 900000,
  NO_KING_AVAILABLE_PENALTY: 500000,
  
  // Priority #3: Foundation Handling
  ACE_TO_FOUNDATION: 50000,
  TWO_TO_FOUNDATION: 45000,
  LOW_CARD_NOT_NEEDED: 35000,
  LOW_CARD_NEEDED: 5000,
  HIGH_CARD_NOT_NEEDED: 10000,
  HIGH_CARD_NEEDED_PENALTY: 20000,
  FOUNDATION_EVENNESS_PENALTY: 5000,
  
  // Priority #4: Draw Pile Management
  DRAW_PILE_FOUNDATION_PENALTY: 5000,
  DRAW_PILE_TABLEAU_PENALTY: 50000,
  DRAW_PILE_KING_EXCEPTION: 80000,
  DRAW_PILE_UNLOCK_BONUS: 30000,
  UNLOCK_THRESHOLD_FACE_DOWN: 3,
  
  // Priority #5: Flexibility and Options
  BUILD_ON_COLUMN_BONUS: 500,
  CARDS_MOVING_BONUS: 100,
  SUIT_DIVERSITY_BONUS: 200,
  NEARLY_CLEAR_COLUMN_BONUS: 300,
  
  // Reveal value evaluation
  REVEAL_BASE_VALUE: 50,
  REVEAL_KING_BONUS: 30,
  REVEAL_QUEEN_BONUS: 20,
  REVEAL_JACK_BONUS: 15,
  REVEAL_ACE_BONUS: 40,
  REVEAL_PLAYABLE_BONUS: 25,
  REVEAL_LAST_FACE_DOWN_BONUS: 30,
  
  // Source scoring
  TABLEAU_SOURCE_BASE: 1000,
  DISCARD_SOURCE_BASE: 1000,
} as const;

/**
 * Timing configuration for auto-play animations
 */
export const AUTOPLAY_TIMING = {
  /** Delay between moves in normal mode (ms) */
  NORMAL_MOVE_DELAY: 1000,
  /** Delay between moves in fast/auto-complete mode (ms) */
  FAST_MOVE_DELAY: 100,
  /** Delay before executing a move in normal mode (ms) */
  SELECT_DELAY_NORMAL: 200,
  /** Delay before executing a move in fast mode (ms) */
  SELECT_DELAY_FAST: 50,
  /** Initial delay before starting auto-play (ms) */
  START_DELAY: 500,
  /** Delay before starting auto-complete (ms) */
  AUTO_COMPLETE_START_DELAY: 100,
} as const;

/**
 * Loop detection configuration
 */
export const AUTOPLAY_LOOP_DETECTION = {
  /** Maximum number of states to track for loop detection */
  MAX_STATE_HISTORY: 20,
} as const;

/**
 * Combined auto-play configuration
 * @public
 */
export const AUTOPLAY_CONFIG = {
  scoring: AUTOPLAY_SCORING,
  timing: AUTOPLAY_TIMING,
  loopDetection: AUTOPLAY_LOOP_DETECTION,
} as const;

/**
 * Type inference for configuration
 */
export type AutoPlayConfig = typeof AUTOPLAY_CONFIG;
export type AutoPlayScoring = typeof AUTOPLAY_SCORING;
export type AutoPlayTiming = typeof AUTOPLAY_TIMING;
export type AutoPlayLoopDetection = typeof AUTOPLAY_LOOP_DETECTION;
