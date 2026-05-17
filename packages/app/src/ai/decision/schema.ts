/**
 * Validation of the LLM's raw output into a trusted {@link AIMoveDecision}.
 *
 * The LLM only ever returns an *index* into the legal-moves list we supplied,
 * so it is structurally impossible for it to choose an illegal move. This
 * module enforces that the index is in range and coerces the remaining fields
 * into safe values.
 *
 * @module ai/decision/schema
 */

import { AIError, type AIMoveDecision } from '../types';
import { parseLooseJsonObject } from '../jsonExtract';

/** Clamp a number into `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Validate a parsed object into an {@link AIMoveDecision}.
 *
 * `moveIndex` is validated strictly — an out-of-range or non-integer index is
 * rejected, because applying it would touch the board. `reasoning` and
 * `confidence` are display-only and are coerced to safe defaults rather than
 * rejected, so a sound move choice is never discarded over cosmetics.
 *
 * @param raw - The parsed model output (object expected).
 * @param legalMoveCount - Number of legal moves offered to the model.
 * @throws {AIError} of kind `bad_response` when `moveIndex` is unusable.
 */
export function validateDecision(raw: unknown, legalMoveCount: number): AIMoveDecision {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AIError('bad_response', 'AI response was not a JSON object.');
  }
  const obj = raw as Record<string, unknown>;

  // --- moveIndex (strict) ---
  const rawIndex = obj.moveIndex;
  const moveIndex =
    typeof rawIndex === 'number'
      ? rawIndex
      : typeof rawIndex === 'string'
        ? Number(rawIndex)
        : NaN;
  if (!Number.isInteger(moveIndex)) {
    throw new AIError(
      'bad_response',
      `AI returned a non-integer moveIndex (${JSON.stringify(rawIndex)}).`,
    );
  }
  if (moveIndex < 0 || moveIndex >= legalMoveCount) {
    throw new AIError(
      'bad_response',
      `AI chose move index ${moveIndex}, which is outside the valid range 0..${legalMoveCount - 1}.`,
    );
  }

  // --- reasoning (coerced) ---
  const reasoning =
    typeof obj.reasoning === 'string' && obj.reasoning.trim().length > 0
      ? obj.reasoning.trim()
      : 'No reasoning provided.';

  // --- confidence (coerced + clamped) ---
  let confidence = typeof obj.confidence === 'number' ? obj.confidence : Number(obj.confidence);
  if (!Number.isFinite(confidence)) {
    confidence = 0.5;
  }
  // Tolerate models that answer on a 0-100 scale.
  if (confidence > 1) {
    confidence = confidence / 100;
  }
  confidence = clamp(confidence, 0, 1);

  // --- alternativeMoveIndex (optional, dropped if invalid) ---
  let alternativeMoveIndex: number | undefined;
  const rawAlt = obj.alternativeMoveIndex;
  const alt =
    typeof rawAlt === 'number'
      ? rawAlt
      : typeof rawAlt === 'string'
        ? Number(rawAlt)
        : NaN;
  if (Number.isInteger(alt) && alt >= 0 && alt < legalMoveCount && alt !== moveIndex) {
    alternativeMoveIndex = alt;
  }

  return { moveIndex, reasoning, confidence, alternativeMoveIndex };
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
