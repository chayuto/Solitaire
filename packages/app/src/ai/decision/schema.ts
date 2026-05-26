/**
 * Validation of the LLM's raw output into a trusted {@link AIMoveDecision}.
 *
 * The model is asked for a three-key object — `board_analysis`,
 * `strategic_plan`, `final_decision` (in that order) — so it analyses and
 * plans before committing. `final_decision` holds the move index it chose.
 *
 * The LLM only ever returns an *index* into the legal-moves list we supplied,
 * so it is structurally impossible for it to choose an illegal move. This
 * module enforces that the index is in range, normalizes the nested shape into
 * a flat {@link AIMoveDecision}, and coerces the remaining fields to safe
 * values. It also tolerates a flat response, for robustness.
 *
 * @module ai/decision/schema
 */

import { AIError, type AIMoveDecision } from '../types';
import { parseLooseJsonObject } from '../jsonExtract';

/** Clamp a number into `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Return `value` as a plain object, or `null`. */
function asObject(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/** Coerce a value to a number, or `NaN`. */
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return NaN;
}

/** First defined value among the candidates. */
function pick(...candidates: unknown[]): unknown {
  return candidates.find((c) => c !== undefined && c !== null);
}

/**
 * Validate a parsed object into an {@link AIMoveDecision}.
 *
 * `moveIndex` is validated strictly: an out-of-range or non-integer index is
 * rejected, because applying it would touch the board. The text fields are
 * display-only and are coerced to safe defaults rather than rejected.
 *
 * The sentinel `-1` is accepted as a resignation signal (see the
 * 2026-05-26 resign ask). The harness branch on `-1` skips move
 * application and terminates the session; no other code path consumes it.
 *
 * @param raw - The parsed model output (object expected).
 * @param legalMoveCount - Number of legal moves offered to the model.
 * @throws {AIError} of kind `bad_response` when `moveIndex` is unusable.
 */
export function validateDecision(raw: unknown, legalMoveCount: number): AIMoveDecision {
  const obj = asObject(raw);
  if (!obj) {
    throw new AIError('bad_response', 'AI response was not a JSON object.');
  }

  // The chosen move lives in `final_decision`; tolerate a flat object too.
  const decisionBlock = asObject(obj.final_decision) ?? asObject(obj.finalDecision) ?? obj;

  // --- moveIndex (strict) ---
  const rawIndex = pick(
    decisionBlock.move_index,
    decisionBlock.moveIndex,
    obj.move_index,
    obj.moveIndex,
  );
  const moveIndex = toNumber(rawIndex);
  if (!Number.isInteger(moveIndex)) {
    throw new AIError(
      'bad_response',
      `AI returned a non-integer move index (${JSON.stringify(rawIndex)}).`,
    );
  }
  // `-1` is the resignation sentinel; any other negative index is invalid.
  if (moveIndex !== -1 && (moveIndex < 0 || moveIndex >= legalMoveCount)) {
    throw new AIError(
      'bad_response',
      `AI chose move index ${moveIndex}, outside the valid range 0..${legalMoveCount - 1} (or -1 to resign).`,
    );
  }

  // --- confidence (coerced + clamped) ---
  let confidence = toNumber(pick(decisionBlock.confidence, obj.confidence));
  if (!Number.isFinite(confidence)) {
    confidence = 0.5;
  }
  if (confidence > 1) {
    confidence = confidence / 100; // tolerate a 0-100 scale
  }
  confidence = clamp(confidence, 0, 1);

  // --- alternativeMoveIndex (optional, dropped if invalid) ---
  let alternativeMoveIndex: number | undefined;
  const alt = toNumber(
    pick(
      decisionBlock.alternative_move_index,
      decisionBlock.alternativeMoveIndex,
      obj.alternative_move_index,
      obj.alternativeMoveIndex,
    ),
  );
  if (Number.isInteger(alt) && alt >= 0 && alt < legalMoveCount && alt !== moveIndex) {
    alternativeMoveIndex = alt;
  }

  // --- text fields (coerced) ---
  const boardAnalysisRaw = pick(obj.board_analysis, obj.boardAnalysis);
  const boardAnalysis =
    typeof boardAnalysisRaw === 'string' && boardAnalysisRaw.trim().length > 0
      ? boardAnalysisRaw.trim()
      : undefined;

  const reasoningRaw = pick(obj.strategic_plan, obj.strategicPlan, obj.reasoning);
  const reasoning =
    typeof reasoningRaw === 'string' && reasoningRaw.trim().length > 0
      ? reasoningRaw.trim()
      : 'No reasoning provided.';

  return { boardAnalysis, reasoning, moveIndex, confidence, alternativeMoveIndex };
}

/**
 * Parse free-form model output text into a validated {@link AIMoveDecision}.
 *
 * @param text - Raw text returned by the model.
 * @param legalMoveCount - Number of legal moves offered to the model.
 * @throws {AIError} of kind `bad_response` when the text cannot be parsed or
 *   the decision is invalid.
 */
export function parseDecision(text: string, legalMoveCount: number): AIMoveDecision {
  const parsed = parseLooseJsonObject(text);
  if (parsed === null) {
    const preview = text.trim().slice(0, 160);
    throw new AIError(
      'bad_response',
      `AI did not return parseable JSON. Response began: "${preview}"`,
    );
  }
  return validateDecision(parsed, legalMoveCount);
}
