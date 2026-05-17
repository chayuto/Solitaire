/**
 * Diagnostic logging for AI requests: time taken and token usage.
 *
 * For now this is backend-only. Each API call appends a structured entry to an
 * in-memory ring buffer and writes a line to the console. There is no UI
 * surface yet; the buffer is readable via the test bridge (`getAIDiagnostics`).
 * One entry corresponds to one API call (a move that was retried produces one
 * entry per attempt).
 *
 * @module ai/diagnostics
 */

import type { AIErrorKind } from './types';

/** A single AI API-call diagnostic record. */
export interface AIDiagnostics {
  /** When the call finished. */
  timestamp: number;
  /** Model that handled (or was meant to handle) the call. */
  model: string;
  /** Whether the call succeeded. */
  outcome: 'success' | 'error';
  /** Wall-clock duration of the call, in ms. */
  durationMs: number;
  /** Prompt (input) tokens, when reported by the provider. */
  promptTokens?: number;
  /** Thinking tokens, when reported (thinking models only). */
  thoughtTokens?: number;
  /** Output (answer) tokens, when reported. */
  outputTokens?: number;
  /** Total billed tokens, when reported. */
  totalTokens?: number;
  /** Failure category, for `error` outcomes. */
  errorKind?: AIErrorKind;
}

/** Maximum diagnostic entries retained in memory. */
const MAX_ENTRIES = 100;

const buffer: AIDiagnostics[] = [];

/** Record a diagnostic entry: append to the ring buffer and log to the console. */
export function recordAIDiagnostics(entry: AIDiagnostics): void {
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();

  const seconds = (entry.durationMs / 1000).toFixed(1);
  if (entry.outcome === 'success') {
    console.info(
      `[AI] ${entry.model} ok in ${seconds}s · tokens` +
        ` prompt=${entry.promptTokens ?? '?'}` +
        ` thoughts=${entry.thoughtTokens ?? '?'}` +
        ` output=${entry.outputTokens ?? '?'}` +
        ` total=${entry.totalTokens ?? '?'}`,
    );
  } else {
    console.warn(
      `[AI] ${entry.model} failed (${entry.errorKind ?? 'error'}) after ${seconds}s`,
    );
  }
}

/** A snapshot of the diagnostic ring buffer, most recent last. */
export function getAIDiagnostics(): readonly AIDiagnostics[] {
  return [...buffer];
}

/** The most recent diagnostic entry, or `null`. */
export function getLastAIDiagnostics(): AIDiagnostics | null {
  return buffer.length > 0 ? buffer[buffer.length - 1] : null;
}

/** Clear the diagnostic ring buffer (used by tests). */
export function clearAIDiagnostics(): void {
  buffer.length = 0;
}
