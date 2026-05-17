/**
 * Constants for the AI Move Advisor.
 *
 * @module ai/constants
 */

/**
 * Request timeout for an AI move suggestion, in milliseconds.
 *
 * `gemma-4-31b-it` is a *thinking* model: it reasons internally before
 * answering, and on a complex board that can take a couple of minutes. We
 * allow a generous 3.5-minute ceiling so a slow-but-valid response is not
 * killed prematurely.
 */
export const AI_REQUEST_TIMEOUT_MS = 210_000;

/** Maximum number of past AI decisions retained in the store's decision log. */
export const AI_DECISION_LOG_LIMIT = 30;

/** Maximum number of LLM interactions retained in the in-memory harvest log. */
export const AI_INTERACTION_LOG_LIMIT = 200;

/**
 * Pause between moves while the AI is auto-playing the whole game. The LLM
 * round-trip dominates the pacing; this is just a brief visible beat so the
 * board update is perceptible before the next request starts.
 */
export const AI_AUTO_MOVE_DELAY = 800;

/** Board-state hashes retained for AI auto-play loop detection. */
export const AI_AUTO_HISTORY_LIMIT = 60;

/**
 * How many times a single move request is attempted before giving up. LLM
 * endpoints are not perfectly stable; transient failures are retried with
 * exponential backoff (see `ai/retry`).
 */
export const AI_RETRY_MAX_ATTEMPTS = 4;

/** Base backoff delay (ms) before the first retry. Doubles each attempt. */
export const AI_RETRY_BASE_DELAY = 2000;

/** Maximum backoff delay (ms) between retries. */
export const AI_RETRY_MAX_DELAY = 30_000;

/**
 * Cooldown (ms) before AI auto-play re-attempts a move after a request
 * exhausted its retries with a transient (infrastructure) error. Auto-play
 * keeps going rather than stopping on a flaky API.
 */
export const AI_AUTO_RETRY_COOLDOWN = 12_000;

/** Sampling temperature for move suggestions — low, for consistent advice. */
export const AI_TEMPERATURE = 0.3;

/** Base URL for the Google Generative Language REST API. */
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
