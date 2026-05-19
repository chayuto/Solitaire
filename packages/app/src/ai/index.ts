/**
 * AI Move Advisor — public surface.
 *
 * Lets a player ask an LLM (Google Gemini / Gemma) for the next best move.
 * The model receives a structured game snapshot plus a numbered list of legal
 * moves and must return its choice as an index into that list.
 *
 * @module ai
 */

export * from './types';
export {
  AI_REQUEST_TIMEOUT_MS,
  AI_DECISION_LOG_LIMIT,
  AI_AUTO_MOVE_DELAY,
  AI_AUTO_HISTORY_LIMIT,
  AI_AUTO_LOOP_LIMIT,
  AI_AUTO_STALL_LIMIT,
  AI_RETRY_MAX_ATTEMPTS,
  AI_AUTO_RETRY_COOLDOWN,
} from './constants';

// Retry / resilience
export {
  suggestMoveWithRetry,
  isRetryableAIError,
  isTransientAIError,
  backoffDelay,
  RETRYABLE_ERROR_KINDS,
  TRANSIENT_ERROR_KINDS,
} from './retry';
export type { RetryInfo, SuggestMoveRetryOptions } from './retry';

// LLM interaction log (harvesting / diagnostics)
export {
  recordAIInteraction,
  getAIInteractions,
  getLastAIInteraction,
  clearAIInteractions,
  exportAIInteractions,
  setLastInteractionMovesApplied,
} from './interactionLog';
export type { AIInteraction, AISessionSummary } from './interactionLog';

// Progress metric (harvesting / stall detection)
export { computeProgressComponents } from './progressMetric';
export type { ProgressComponents } from './progressMetric';

// Identifiers
export { uuidv7 } from './uuid';

// Configuration / presets
export { DEFAULT_AI_CONFIG, PRESET_FIELDS, applyPreset } from './context/presets';

// Context building
export { buildContext } from './context/buildContext';
export { buildSystemInstruction } from './context/systemInstruction';
export { describeMoveCommand, summarizeHistoryMove } from './context/describeMove';
export { NOTATION_LEGEND } from './cardNotation';

// Decision validation
export { validateDecision, parseDecision } from './decision/schema';

// Providers
export {
  getProvider,
  listProviders,
  setProviderOverride,
  getProviderOverride,
  createStubProvider,
} from './providers';
export type { StubDecisionFn } from './providers';

// Key storage
export {
  getKey,
  getEffectiveKey,
  setKey,
  clearKey,
  hasUsableKey,
  hasUserKey,
  getDevFallbackKey,
} from './keyStore';
