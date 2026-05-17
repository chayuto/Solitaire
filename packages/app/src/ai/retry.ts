/**
 * Retry-with-backoff for AI move requests.
 *
 * LLM endpoints are not perfectly stable: transient failures (network errors,
 * timeouts, rate limits, 5xx responses, the occasional unparseable answer) are
 * retried with exponential backoff before the error is surfaced.
 *
 * @module ai/retry
 */

import { AI_RETRY_BASE_DELAY, AI_RETRY_MAX_DELAY } from './constants';
import { AIError, type AIErrorKind, type AIMoveDecision, type AIProvider, type AIRequest } from './types';

/**
 * Error kinds worth retrying within a single request. Includes `bad_response`
 * because a (non-deterministic) model sometimes returns unusable output that a
 * fresh generation fixes.
 */
export const RETRYABLE_ERROR_KINDS: ReadonlySet<AIErrorKind> = new Set<AIErrorKind>([
  'network',
  'timeout',
  'rate_limited',
  'unavailable',
  'bad_response',
]);

/**
 * Transient *infrastructure* errors. AI auto-play keeps going through these
 * (it cools down and re-attempts) rather than stopping. `bad_response` is
 * deliberately excluded: a model that cannot follow the format is a capability
 * problem, not a flaky-network problem, so auto-play stops on it.
 */
export const TRANSIENT_ERROR_KINDS: ReadonlySet<AIErrorKind> = new Set<AIErrorKind>([
  'network',
  'timeout',
  'rate_limited',
  'unavailable',
]);

/** Whether an error should be retried within a single request. */
export function isRetryableAIError(err: unknown): boolean {
  return err instanceof AIError && RETRYABLE_ERROR_KINDS.has(err.kind);
}

/** Whether an error is a transient infrastructure failure (auto-play survives it). */
export function isTransientAIError(err: unknown): boolean {
  return err instanceof AIError && TRANSIENT_ERROR_KINDS.has(err.kind);
}

/** Exponential backoff (with jitter) before retry attempt `attempt` (1-based). */
export function backoffDelay(attempt: number): number {
  const exponential = AI_RETRY_BASE_DELAY * 2 ** (attempt - 1);
  const capped = Math.min(exponential, AI_RETRY_MAX_DELAY);
  return capped + Math.floor(Math.random() * 500);
}

/** A sleep that rejects with an aborted {@link AIError} if `signal` fires. */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AIError('aborted', 'The AI request was cancelled.'));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AIError('aborted', 'The AI request was cancelled.'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Details of a retry, passed to the {@link SuggestMoveRetryOptions.onRetry} callback. */
export interface RetryInfo {
  /** The attempt that just failed (1-based). */
  attempt: number;
  /** Total attempts that will be made. */
  maxAttempts: number;
  /** The failure being retried. */
  error: AIError;
  /** Delay before the next attempt, in ms. */
  delayMs: number;
}

/** Options for {@link suggestMoveWithRetry}. */
export interface SuggestMoveRetryOptions {
  /** Maximum number of attempts (>= 1). */
  maxAttempts: number;
  /** Abort signal — cancels both the request and any pending backoff. */
  signal?: AbortSignal;
  /** Invoked after each failed-but-retryable attempt, before the backoff wait. */
  onRetry?: (info: RetryInfo) => void;
}

/**
 * Call `provider.suggestMove`, retrying transient failures with exponential
 * backoff. Non-retryable errors (and `aborted`) are thrown immediately.
 *
 * @throws {AIError} the last failure if every attempt fails.
 */
export async function suggestMoveWithRetry(
  provider: AIProvider,
  request: AIRequest,
  options: SuggestMoveRetryOptions,
): Promise<AIMoveDecision> {
  const { maxAttempts, signal, onRetry } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new AIError('aborted', 'The AI request was cancelled.');
    }
    try {
      return await provider.suggestMove(request);
    } catch (err) {
      lastError = err;
      // Never retry a cancellation or a non-retryable error.
      if (err instanceof AIError && err.kind === 'aborted') throw err;
      if (!isRetryableAIError(err) || attempt >= maxAttempts) throw err;

      const delayMs = backoffDelay(attempt);
      onRetry?.({ attempt, maxAttempts, error: err as AIError, delayMs });
      await abortableSleep(delayMs, signal);
    }
  }

  throw lastError;
}
