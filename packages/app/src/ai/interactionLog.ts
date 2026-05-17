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
import type { AIErrorKind, AIMoveDecision } from './types';

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
  /** Deal seed of the game, when one was used. */
  seed?: number;
  /** Turn index within the game (move-history length at request time). */
  turnIndex?: number;
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

const buffer: AIInteraction[] = [];

/** Record an interaction: append to the ring buffer and log a console summary. */
export function recordAIInteraction(entry: AIInteraction): void {
  // Stamp the build commit so a harvested row traces back to its code revision.
  const stamped: AIInteraction = entry.appCommit
    ? entry
    : { ...entry, appCommit: APP_COMMIT };
  buffer.push(stamped);
  if (buffer.length > AI_INTERACTION_LOG_LIMIT) buffer.shift();

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
}

/** Serialize the full interaction log to a JSON string for export/harvesting. */
export function exportAIInteractions(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      appCommit: APP_COMMIT,
      appBuildTime: APP_BUILD_TIME,
      count: buffer.length,
      interactions: buffer,
    },
    null,
    2,
  );
}
