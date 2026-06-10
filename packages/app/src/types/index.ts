import type { AIConfig, AIDecisionRecord } from '../ai/types';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  id: string;
}

export type MoveType =
  | 'draw_card'
  | 'recycle_stock'
  | 'tableau_to_tableau'
  | 'tableau_to_foundation'
  | 'discard_to_tableau'
  | 'discard_to_foundation'
  | 'flip_card';

/**
 * Game lifecycle telemetry that is *not* a card move. Kept out of
 * {@link Move} history so `moveHistory` stays a pure record of play (replay,
 * metrics and the AI prompt consume it unfiltered); the Activity Log
 * interleaves these back in by {@link GameEvent.atMoveIndex}.
 */
export type GameEventType =
  | 'autoplay_start'
  | 'autoplay_stop'
  | 'autoplay_deadend'
  | 'autoplay_loop_detected';

/** A telemetry event, anchored to its position in the move timeline. */
export interface GameEvent {
  type: GameEventType;
  timestamp: number;
  /** `moveHistory.length` at the moment the event fired. */
  atMoveIndex: number;
}

export interface Move {
  type: MoveType;
  timestamp: number;
  card: Card;
  from?: {
    source: 'tableau' | 'discard' | 'draw';
    columnIndex?: number;
    cardIndex?: number;
  };
  to?: {
    target: 'tableau' | 'foundation';
    columnIndex?: number;
    suit?: Suit;
  };
  /** True when this entry is part of a move the AI Move Advisor made. */
  aiMove?: boolean;
  /** Reasoning text, set on the lead entry of an AI-chosen move. */
  aiReasoning?: string;
  /** AI self-rated confidence (0-1), set on the lead entry of an AI-chosen move. */
  aiConfidence?: number;
}

/**
 * The complete turn-0 deal, with the true identity of every card (face-down
 * cards included). Snapshotted at deal time and carried with the game so the
 * exact starting board can be reconstructed and replayed. Also embedded in the
 * win/game and ai-log exports as the canonical record of the deck a game was
 * played on.
 */
export interface InitialBoardSetup {
  drawPile: Card[];
  discardPile: Card[];
  foundations: {
    hearts: Card[];
    diamonds: Card[];
    clubs: Card[];
    spades: Card[];
  };
  tableau: Card[][];
}

export interface GameState {
  drawPile: Card[];
  discardPile: Card[];
  foundations: {
    hearts: Card[];
    diamonds: Card[];
    clubs: Card[];
    spades: Card[];
  };
  tableau: Card[][];
  selectedCard?: {
    source: 'tableau' | 'discard';
    columnIndex?: number; // for tableau
    cardIndex?: number; // for tableau (index in column)
    card: Card;
  };
  moveHistory: Move[];
  /**
   * Telemetry events (auto-play lifecycle), parallel to {@link moveHistory}.
   * Optional like the supplemental UI fields below: the store always
   * populates it, but lightweight GameState fixtures need not.
   */
  eventLog?: GameEvent[];
  showValidMoves: boolean;
  godMode: boolean;
  autoPlayEnabled: boolean;
  autoPlayInProgress: boolean;
  autoPlayStateHistory?: string[]; // Track recent game states for loop detection
  difficulty: Difficulty; // Game difficulty level (1=Very Easy, 2=Easy, 3=Normal, 4=Hard, 5=Very Hard)
  seed?: number; // RNG seed for the deal, when one was used (enables a repeatable re-deal)
  gameSessionId?: string; // UUIDv7 identifying this game session (new id per new game)
  gameStartedAt?: number; // Timestamp the session's deal was created
  gameWon: boolean; // True when all cards are in foundations
  winModalDismissed?: boolean; // True when the user closed the win modal without starting a new game
  initialBoardSetup?: InitialBoardSetup;
  perceivedDifficulty?: number; // Calculated difficulty score based on initial board setup (0-100, undefined if no initial setup)
  completionProgress: number; // Game completion percentage (0-100)
  replayMode: boolean; // True when in replay mode
  replayIndex: number; // Current index in move history during replay
  replayPaused: boolean; // True when replay is paused
  replaySpeed: number; // Speed of replay in ms per move (default 1000)
  /**
   * Number of times the waste pile has been recycled back into the stock in
   * this game. Cycle 1 starts at game open with this at 0; the moment the
   * first recycle fires the value becomes 1, which renders as `CYCLE: 2`
   * in the AI prompt. Drives the DRAW TIMELINE block's known-vs-unknown
   * stock identity rule (hybrid-v1.2 onwards).
   */
  recycleCount?: number;

  // --- AI Move Advisor ---
  // Optional, like the other supplemental UI fields above: the store always
  // populates them, but lightweight GameState fixtures need not.
  aiConfig?: AIConfig; // User-configurable AI advisor settings (persists across new games)
  aiThinking?: boolean; // True while an AI move suggestion is in flight
  aiAutoPlay?: boolean; // True while the AI is auto-playing the whole game move-by-move
  aiThinkingSince?: number; // Timestamp the in-flight request started (for the elapsed counter)
  aiStatus?: string; // Soft status line shown while a request is in flight (e.g. retry progress)
  aiRetryCount?: number; // Retries performed for the in-flight/last request
  aiError?: string; // Last AI advisor error message, shown until the next request
  aiDecisionLog?: AIDecisionRecord[]; // History of AI decisions (most recent last)
  aiKeyModalOpen?: boolean; // True when the API key modal is open
  sessionManagerOpen?: boolean; // True when the saved-games manager modal is open
}
