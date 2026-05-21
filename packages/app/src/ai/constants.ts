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
 * allow a generous 4-minute ceiling so a slow-but-valid response is not
 * killed prematurely.
 */
export const AI_REQUEST_TIMEOUT_MS = 240_000;

/** Maximum number of past AI decisions retained in the store's decision log. */
export const AI_DECISION_LOG_LIMIT = 30;

/**
 * Maximum number of LLM interactions retained in the in-memory harvest log.
 *
 * Sized to cover many auto-played teacher games per tab session — one game can
 * produce 80–150 entries (including retries, `forced_move` skips, and
 * `stall_terminated` markers), so the previous 200 silently truncated the
 * opening of a multi-game harvest run. Worst-case memory at 2 000 entries is
 * ~20–80 MB, which a browser tab handles comfortably. When the cap is hit,
 * {@link recordAIInteraction} emits a one-time `console.warn` so silent
 * truncation is visible.
 */
export const AI_INTERACTION_LOG_LIMIT = 2000;

/**
 * Pause between moves while the AI is auto-playing the whole game. The LLM
 * round-trip dominates the pacing; this is just a brief visible beat so the
 * board update is perceptible before the next request starts.
 */
export const AI_AUTO_MOVE_DELAY = 800;

/** Board-state hashes retained for AI auto-play loop detection. */
export const AI_AUTO_HISTORY_LIMIT = 60;

/**
 * How many times the same board position may recur during AI auto-play before
 * it is treated as a stuck loop and stopped. A few repeats are allowed because
 * the AI may legitimately unwind and retry a line of play.
 */
export const AI_AUTO_LOOP_LIMIT = 5;

/**
 * How many consecutive AI auto-play turns may pass with no progress — neither a
 * card reaching a foundation nor a face-down tableau card revealed — before the
 * run is treated as stalled and stopped.
 *
 * Distinct from {@link AI_AUTO_LOOP_LIMIT}, which catches an *exactly* repeating
 * board position. A stall is flat progress while the board still churns (e.g.
 * cycling the stock), which loop detection never catches.
 *
 * Kept in lockstep with `STALL_TURNS` in the analytics-side
 * `scripts/ingest_exports.py` — the harness terminates a game exactly when the
 * ingest filter would have dropped its remaining decisions from training.
 */
export const AI_AUTO_STALL_LIMIT = 25;

/**
 * Minimum fraction of *shuffle* moves in the stall window required to trigger
 * auto-termination. Combined with {@link AI_AUTO_STALL_LIMIT} this is a
 * two-gate rule: terminate only when (plateau ≥ AI_AUTO_STALL_LIMIT) AND
 * (shuffle fraction ≥ AI_AUTO_STALL_SHUFFLE_FRACTION).
 *
 * The shuffle set is `{tableau_to_tableau, discard_to_tableau}` — moves that
 * rearrange visible cards without surfacing new information. `draw_card` and
 * `recycle_stock` are *information-gathering*: a long plateau of draws is an
 * honest hunt for a still-face-down card (e.g. a missing Ace) and must not
 * terminate. `tableau_to_foundation` and `discard_to_foundation` always make
 * progress, so they cannot appear in a plateau window by construction.
 *
 * Empirical anchors (analytics 2026-05-20 doc, two real sessions on the
 * stall threshold):
 *  - `1279a3` — 24-turn plateau, 0% shuffles (18 draws + 1 recycle): honest
 *    hunt, must NOT terminate.
 *  - `73fd85` — 15-turn plateau on its way to a doom-loop, ~70% shuffles
 *    (tableau-to-tableau oscillation): must terminate.
 *
 * 0.6 gives both cases wide headroom; tune from per-termination telemetry on
 * the `stall_terminated` interaction once a real sample exists.
 */
export const AI_AUTO_STALL_SHUFFLE_FRACTION = 0.6;

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

/**
 * Fallback wait (ms) after an HTTP 429 when the response carries no
 * `RetryInfo`. Long enough to clear a per-minute rate-limit window — a short
 * retry would just hit the limit again.
 */
export const AI_RATE_LIMIT_FALLBACK_DELAY = 35_000;

/** Hard cap (ms) on any server-suggested retry delay, against bogus values. */
export const AI_RETRY_DELAY_CAP = 120_000;

/** Sampling temperature for move suggestions — low, for consistent advice. */
export const AI_TEMPERATURE = 0.3;

/** Base URL for the Google Generative Language REST API. */
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
