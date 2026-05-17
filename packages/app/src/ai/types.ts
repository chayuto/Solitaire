/**
 * Type definitions for the AI Move Advisor feature.
 *
 * The AI Move Advisor lets a player ask an LLM (currently Google Gemini) for
 * the next best move. The LLM is given a structured snapshot of the game plus
 * a numbered list of *legal* moves, and must return its choice as an index
 * into that list — it can never describe an illegal move in free text.
 *
 * @module ai/types
 */

import type { MoveCommand } from '@chayuto/solitaire-core';
import type { Suit } from '../types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Identifier for an LLM provider. Extend this union to add new providers. */
export type AIProviderId = 'gemini';

/**
 * Context verbosity preset. Controls how much information is sent to the LLM.
 * `custom` unlocks every individual toggle in {@link AIConfig}.
 */
export type AIContextPreset = 'minimal' | 'standard' | 'detailed' | 'custom';

/**
 * User-configurable settings for the AI advisor. Lives in the game store and
 * persists across new games within a session (but is not exported with a save
 * file, and the API key is never stored here — see {@link module:ai/keyStore}).
 */
export interface AIConfig {
  /** Which LLM provider to use. */
  provider: AIProviderId;
  /** Provider-specific model id, e.g. `gemma-4-31b-it`. */
  model: string;
  /** Active context preset. */
  preset: AIContextPreset;

  // --- Optional context fields (gated by the preset, overridable in `custom`) ---

  /** Include a list of the most recent moves played. */
  includeMoveHistory: boolean;
  /** How many recent moves to include when {@link includeMoveHistory} is on. */
  moveHistoryLimit: number;
  /** Include completion progress, perceived difficulty, move count, difficulty. */
  includeGameMetrics: boolean;
  /** Include a static block of Klondike strategy heuristics in the prompt. */
  includeStrategyGuidance: boolean;
  /** Attach the built-in autoplay heuristic score to each legal move. */
  includeHeuristicScores: boolean;
  /**
   * Include the identities of stock cards the player has already cycled past.
   * Player-visible information — not a fairness concern.
   */
  includeSeenDrawPileCards: boolean;
  /** Feed the AI its own recent decisions + reasons back as context. */
  includeReasoningTrail: boolean;
  /** How many past AI decisions to include when {@link includeReasoningTrail} is on. */
  reasoningTrailLimit: number;

  // --- Fairness toggle (independent of the preset) ---

  /**
   * When `true`, the AI receives every hidden card (face-down tableau cards and
   * the full unseen stock order) — an oracle/solver. When `false`, hidden cards
   * are sent only as counts, so the AI reasons like a fair human advisor.
   */
  seeHiddenCards: boolean;
}

// ---------------------------------------------------------------------------
// Context payload (what we send to the LLM)
// ---------------------------------------------------------------------------

/** A single legal move, as presented to the LLM. */
export interface AILegalMove {
  /** Index into the legal-moves list — the value the LLM must return. */
  index: number;
  /** Move type. */
  type: MoveCommand['type'];
  /** Human-readable description of the move. */
  describe: string;
  /** Autoplay heuristic score (higher = better), when heuristic scores are enabled. */
  heuristicScore?: number;
}

/** One tableau column, as presented to the LLM. */
export interface AITableauColumn {
  /** 1-based column number (1 to 7) — matches the numbering used everywhere else. */
  column: number;
  /** Number of face-down (hidden) cards at the bottom of the column. */
  faceDownCount: number;
  /** Face-up cards, bottom-to-top, in card shorthand (e.g. `["KS","QH"]`). */
  faceUp: string[];
  /** Face-down card identities — only present when `seeHiddenCards` is enabled. */
  faceDown?: string[];
}

/** The structured game snapshot sent to the LLM. Serialized to JSON. */
export interface AIMoveContext {
  /** One-line explanation of the card shorthand notation. */
  notation: string;
  /** Top card of each foundation in shorthand, or `null` when empty. */
  foundations: Record<Suit, string | null>;
  /** The seven tableau columns. */
  tableau: AITableauColumn[];
  /** Top (playable) waste card in shorthand, or `null`. */
  discardTop: string | null;
  /** Number of cards remaining in the stock. */
  drawPileCount: number;
  /** Whether the waste pile can be recycled back into an empty stock. */
  canRecycleStock: boolean;
  /** Every legal move — the LLM must pick one by its `index`. */
  legalMoves: AILegalMove[];

  // --- Optional fields ---

  /** Game metrics (when `includeGameMetrics`). */
  metrics?: {
    completionProgress: number;
    perceivedDifficulty: number | undefined;
    moveCount: number;
    difficulty: number;
  };
  /** Recent moves, most-recent last (when `includeMoveHistory`). */
  recentMoves?: string[];
  /**
   * Stock cards the player has already seen, in the order they will be drawn
   * (when `includeSeenDrawPileCards`).
   */
  seenDrawPileCards?: string[];
  /** Full hidden information (only when `seeHiddenCards`). */
  hiddenInfo?: {
    /** Every stock card in draw order. */
    drawPileOrder: string[];
  };
  /** The AI's own recent decisions (when `includeReasoningTrail`). */
  reasoningTrail?: { move: string; reasoning: string }[];
}

// ---------------------------------------------------------------------------
// Decision (what the LLM returns)
// ---------------------------------------------------------------------------

/**
 * The structured decision parsed from an LLM response. Validated before use.
 *
 * The model emits a three-key JSON object — `board_analysis`, `strategic_plan`,
 * `final_decision` — in that order, so it analyses the board and plans before
 * committing to a move. This is the normalized, flattened form.
 */
export interface AIMoveDecision {
  /** The model's analysis of the board (the `board_analysis` output key). */
  boardAnalysis?: string;
  /** The model's strategic plan / reasoning (the `strategic_plan` output key). */
  reasoning: string;
  /** Chosen move index into the legal-moves list (from `final_decision`). */
  moveIndex: number;
  /** The LLM's self-rated confidence, 0–1 (from `final_decision`). */
  confidence: number;
  /** Optional runner-up move index (from `final_decision`). */
  alternativeMoveIndex?: number;
}

// ---------------------------------------------------------------------------
// Provider abstraction
// ---------------------------------------------------------------------------

/** A request handed to a provider's {@link AIProvider.suggestMove}. */
export interface AIRequest {
  /** The user's API key (empty string for providers that don't need one). */
  apiKey: string;
  /** Provider-specific model id. */
  model: string;
  /** System instruction text (rules, role, output format). */
  systemInstruction: string;
  /** The structured game context. */
  context: AIMoveContext;
  /** Optional abort signal for cancellation / timeout. */
  signal?: AbortSignal;
  /**
   * UUIDv7 idempotency id for the logical request (one move decision).
   * Retries of the same request reuse it; each interaction is logged under it.
   */
  requestId?: string;
  /** UUIDv7 of the game session this request belongs to. */
  sessionId?: string;
  /** Deal seed of the game, when one was used. */
  seed?: number;
  /** Move-history length when the request was made (a turn index within the game). */
  turnIndex?: number;
  /** 1-based attempt number, set by the retry wrapper. */
  attempt?: number;
}

/**
 * An LLM provider. Implementations own only transport concerns — building the
 * request, calling the API, parsing the raw response into an {@link AIMoveDecision}.
 * They do not own game logic or prompt content.
 */
export interface AIProvider {
  /** Stable provider id. */
  readonly id: string;
  /** Human-readable name shown in the UI. */
  readonly displayName: string;
  /** Whether this provider needs an API key (test stubs do not). */
  readonly requiresKey: boolean;
  /** Default model id. */
  readonly defaultModel: string;
  /** Selectable model ids. */
  readonly availableModels: readonly string[];
  /** URL where a user can obtain an API key. */
  readonly apiKeyUrl: string;
  /** Ask the model for a move. Rejects with an {@link AIError} on failure. */
  suggestMove(request: AIRequest): Promise<AIMoveDecision>;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Categorized failure modes for the AI advisor. */
export type AIErrorKind =
  | 'no_key' // no API key configured
  | 'invalid_key' // provider rejected the key
  | 'rate_limited' // provider rate limit hit
  | 'network' // network failure
  | 'timeout' // request exceeded the timeout
  | 'aborted' // request was cancelled
  | 'bad_response' // provider returned something unusable
  | 'no_moves' // no legal moves to choose from
  | 'busy' // a request is already in flight
  | 'unavailable' // game is in a state where the advisor can't run
  | 'config'; // misconfiguration (e.g. unknown provider)

/** A typed, user-presentable error for the AI advisor. */
export class AIError extends Error {
  /** The categorized failure mode. */
  readonly kind: AIErrorKind;

  constructor(kind: AIErrorKind, message: string) {
    super(message);
    this.name = 'AIError';
    this.kind = kind;
  }
}

// ---------------------------------------------------------------------------
// Store-side records
// ---------------------------------------------------------------------------

/**
 * A record of one AI decision, kept in the store's `aiDecisionLog` and included
 * in an exported game. Carries enough detail (the choice, the reasoning, the
 * cost, the alternatives) to serve as a row in a future benchmarking dataset.
 */
export interface AIDecisionRecord {
  /** When the decision was applied. */
  timestamp: number;
  /** The chosen move's type. */
  moveType: MoveCommand['type'];
  /** Human-readable description of the chosen move. */
  describe: string;
  /** The LLM's board analysis (the `board_analysis` output key). */
  boardAnalysis?: string;
  /** The LLM's strategic plan / reasoning. */
  reasoning: string;
  /** The LLM's confidence, 0–1. */
  confidence: number;
  /** Description of the runner-up move, if the LLM supplied one. */
  alternativeDescribe?: string;
  /** Model that produced the decision. */
  model: string;
  /** UUIDv7 of the request that produced this decision (joins the interaction log). */
  requestId?: string;
  /** Index the model chose, within the legal-move list it was shown. */
  moveIndex?: number;
  /** Number of legal moves the model chose from. */
  legalMoveCount?: number;
  /** Wall-clock time for the move, including retries, in ms. */
  durationMs?: number;
  /** Retries performed before the move succeeded. */
  retries?: number;
  /** Prompt (input) tokens, when the provider reported usage. */
  promptTokens?: number;
  /** Thinking tokens, when reported (thinking models only). */
  thoughtTokens?: number;
  /** Output (answer) tokens, when reported. */
  outputTokens?: number;
  /** Total billed tokens, when reported. */
  totalTokens?: number;
}
