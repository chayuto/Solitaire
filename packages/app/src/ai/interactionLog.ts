/**
 * LLM interaction log: a complete record of every API call the AI advisor
 * makes, kept for harvesting (a future training/benchmarking dataset).
 *
 * Each call appends a structured entry — request id, prompt, raw response,
 * parsed decision, token metrics, time taken, model — to an in-memory ring
 * buffer and writes a summary line to the console. The buffer is readable and
 * exportable via the test bridge and the "Export AI Log" button.
 *
 * @module ai/interactionLog
 */

import { APP_BUILD_TIME, APP_COMMIT } from '../buildInfo';
import { AI_INTERACTION_LOG_LIMIT } from './constants';
import type { AIConfig, AIErrorKind, AIMoveDecision } from './types';

/** A complete record of one LLM API call. */
export interface AIInteraction {
  /** UUIDv7 unique to this API call. */
  id: string;
  /** UUIDv7 of the game session this call belongs to. */
  sessionId: string;
  /** UUIDv7 of the parent request (one move decision). Retries share it. */
  requestId: string;
  /** 1-based attempt number within the parent request. */
  attempt: number;
  /** When the call finished. */
  timestamp: number;
  /** Provider id (e.g. `gemini`). */
  provider: string;
  /** Model id. */
  model: string;
  /** Git commit hash of the build that produced this interaction. */
  appCommit?: string;
  /**
   * SHA-256 hex digest of the assembled system-instruction text sent to the
   * model — the deterministic identity of the prompt template variant. Lets a
   * harvested dataset segment on the prompt directly instead of inferring it
   * from `appCommit` (which, per the 2026-05-22 audit, can drift independently
   * of any visible template change).
   */
  promptTemplateHash?: string;
  /**
   * ISO 8601 UTC timestamp marking when the current prompt template was
   * finalised — the human-readable companion to {@link promptTemplateHash}.
   * Defined as `PROMPT_TEMPLATE_FINALISED_AT` in `ai/context/systemInstruction`
   * and bumped whenever any of the template blocks changes (the tripwire test
   * enforces it).
   */
  promptTemplateFinalisedAt?: string;
  /**
   * Decoding parameters sent to the provider for this call. Mirrors the
   * "stamp the variable on every row" discipline applied to the prompt
   * template hash: even when these values are constant in production, the
   * dataset side can attribute behaviour to the exact decoding setup that
   * produced it without inferring from build hash. New fields (e.g. `topP`,
   * `topK`) get appended here if `generationConfig` ever grows.
   */
  inferenceParams?: {
    /** Sampling temperature passed to the provider (0 = greedy). */
    temperature?: number;
  };
  /** Deal seed of the game, when one was used. */
  seed?: number;
  /** Turn index within the game (move-history length at request time). */
  turnIndex?: number;
  /**
   * Snapshot of the AI config that produced this interaction. Lets a harvested
   * dataset be segmented by the exact config (preset, history/trail limits,
   * fairness toggle) without inferring it from prompt structure.
   */
  config?: AIConfig;
  /**
   * Set on entries that are *not* a real API call: a move the advisor flow
   * resolved itself. `forced_move` — the position had a single legal move, so
   * it was auto-played without consulting the model. `stall_terminated` — AI
   * auto-play was stopped because the game made no progress. Absent on a normal
   * API call.
   */
  event?: 'forced_move' | 'stall_terminated';
  /**
   * Plateau length at the moment a `stall_terminated` event fired — number of
   * consecutive flat-progress turns. Equals `AI_AUTO_STALL_LIMIT` at the first
   * possible trigger; may be larger if other gates delayed the fire.
   */
  plateauLength?: number;
  /**
   * Shuffle fraction over the move-type window at the moment of trigger
   * (`{tableau_to_tableau, discard_to_tableau}` / window length, in [0, 1]).
   * Lets the analytics side audit and tune `AI_AUTO_STALL_SHUFFLE_FRACTION`
   * without re-deriving it from the moves applied.
   */
  shuffleFraction?: number;
  /**
   * The exact move-type window that produced {@link shuffleFraction}. One entry
   * per flat turn in the plateau, oldest first. Length matches
   * {@link plateauLength} at trigger time.
   */
  moveTypeWindow?: string[];
  /**
   * Move-history entry types this interaction's move produced (e.g. a
   * `tableau_to_foundation` followed by a `flip_card`). Lets a consumer
   * reconstruct the full move sequence and see why `turnIndex` advances by
   * more than one between calls.
   */
  movesApplied?: string[];
  /** Whether the call succeeded. */
  outcome: 'success' | 'error';
  /** Wall-clock duration of the call, in ms. */
  durationMs: number;
  /** The full prompt text sent to the model. */
  prompt: string;
  /** The raw response text from the model, when one was received. */
  rawResponse?: string;
  /** The model's internal reasoning trace (thinking-model "thought" parts), when present. */
  thinkingText?: string;
  /** The parsed, validated decision, on success. */
  decision?: AIMoveDecision;
  /** HTTP status code of the response, when one was received. */
  httpStatus?: number;
  /** Failure category, for `error` outcomes. */
  errorKind?: AIErrorKind;
  /** Failure message, for `error` outcomes. */
  errorMessage?: string;
  /** Prompt (input) tokens, when reported. */
  promptTokens?: number;
  /** Thinking tokens, when reported (thinking models only). */
  thoughtTokens?: number;
  /** Output (answer) tokens, when reported. */
  outputTokens?: number;
  /** Total billed tokens, when reported. */
  totalTokens?: number;
}

/**
 * Session-level outcome of the game active at export time. Lets a consumer
 * filter a harvested dataset for quality games (e.g. only wins) without a
 * separate win-record file.
 */
export interface AISessionSummary {
  /** UUIDv7 of the game session (joins {@link AIInteraction.sessionId}). */
  sessionId: string;
  /** Deal seed of the game, when one was used. */
  seed?: number;
  /** Model that drove the session. */
  model: string;
  /**
   * How the game ended:
   * - `won` — all 52 cards home.
   * - `lost` — no legal moves remain.
   * - `stalled_auto_terminated` — auto-play hit the two-gate stall rule
   *   (long flat-progress plateau dominated by shuffle moves) and the harness
   *   stopped calling the teacher. Distinct from `incomplete` so the analytics
   *   side can separate machine-terminated runs from player-abandoned ones.
   * - `incomplete` — exported mid-game (abandoned, or a stop other than the
   *   stall terminator).
   */
  outcome: 'won' | 'lost' | 'stalled_auto_terminated' | 'incomplete';
  /** Completion progress at export time (0–100). */
  finalProgress: number;
  /** Total move-history length at export time. */
  moveCount: number;
}

const buffer: AIInteraction[] = [];
/**
 * Whether the buffer has overflowed at least once in this tab session. A
 * silent `buffer.shift()` would otherwise discard the opening of a harvest run
 * unnoticed — we warn exactly once so the operator knows to export sooner.
 */
let overflowWarned = false;

/** Record an interaction: append to the ring buffer and log a console summary. */
export function recordAIInteraction(entry: AIInteraction): void {
  // Stamp the build commit so a harvested row traces back to its code revision.
  const stamped: AIInteraction = entry.appCommit
    ? entry
    : { ...entry, appCommit: APP_COMMIT };
  buffer.push(stamped);
  if (buffer.length > AI_INTERACTION_LOG_LIMIT) {
    buffer.shift();
    if (!overflowWarned) {
      overflowWarned = true;
      console.warn(
        `[AI] interaction log reached ${AI_INTERACTION_LOG_LIMIT} entries; oldest entries are now being dropped. Export the log to preserve a full harvest.`,
      );
    }
  }

  const seconds = (entry.durationMs / 1000).toFixed(1);
  if (entry.outcome === 'success') {
    console.info(
      `[AI] ${entry.model} ok in ${seconds}s (req ${entry.requestId.slice(0, 8)} #${entry.attempt})` +
        ` · tokens prompt=${entry.promptTokens ?? '?'}` +
        ` thoughts=${entry.thoughtTokens ?? '?'}` +
        ` output=${entry.outputTokens ?? '?'}` +
        ` total=${entry.totalTokens ?? '?'}`,
    );
  } else {
    console.warn(
      `[AI] ${entry.model} failed (${entry.errorKind ?? 'error'}) after ${seconds}s` +
        ` (req ${entry.requestId.slice(0, 8)} #${entry.attempt})`,
    );
  }
}

/**
 * Attach to the most recent interaction the move-history entry types its move
 * produced. Called after the chosen move is applied, so a consumer can tell a
 * decision's consequence entries (e.g. `flip_card`) apart from missing turns.
 */
export function setLastInteractionMovesApplied(moveTypes: string[]): void {
  const last = buffer[buffer.length - 1];
  if (last) last.movesApplied = moveTypes;
}

/** A snapshot of the interaction log, most recent last. */
export function getAIInteractions(): readonly AIInteraction[] {
  return [...buffer];
}

/** The most recent interaction, or `null`. */
export function getLastAIInteraction(): AIInteraction | null {
  return buffer.length > 0 ? buffer[buffer.length - 1] : null;
}

/** Clear the interaction log (used by tests). */
export function clearAIInteractions(): void {
  buffer.length = 0;
  overflowWarned = false;
}

/**
 * Serialize the full interaction log to a JSON string for export/harvesting.
 *
 * @param session - Outcome summary of the game active at export time, when
 *   available. Describes the current session only; individual interactions
 *   carry their own `sessionId` for multi-game buffers.
 */
export function exportAIInteractions(session?: AISessionSummary): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      appCommit: APP_COMMIT,
      appBuildTime: APP_BUILD_TIME,
      session,
      count: buffer.length,
      interactions: buffer,
    },
    null,
    2,
  );
}
