/**
 * Assembles the system-instruction text for an AI request from the static
 * rule/strategy/output blocks, honoring the active configuration. Also exposes
 * a hash of that assembled text and the date the current template was
 * finalised, so the harvested dataset can attribute behaviour to the specific
 * prompt that produced it.
 *
 * The prompt is the most important independent variable of any harvested run,
 * and (as the 2026-05-22 prompt-template audit showed) build hashes alone are
 * a poor proxy for it. Every interaction now carries the prompt's own
 * fingerprint so a downstream analysis can group/segment on it directly.
 *
 * @module ai/context/systemInstruction
 */

import type { AIConfig } from '../types';
import { OUTPUT_INSTRUCTION, RULES_PRIMER, STRATEGY_GUIDANCE } from './rulesPrimer';

/**
 * Date the current system-instruction template was last changed.
 *
 * **Bump this whenever {@link RULES_PRIMER}, {@link STRATEGY_GUIDANCE}, or
 * {@link OUTPUT_INSTRUCTION} is edited.** The tripwire test in
 * `systemInstruction.test.ts` fails if the hashes shift without a bump.
 *
 * Format: ISO 8601 UTC, second precision. A date (not a semantic version)
 * because the templates evolve independently of any release cadence and the
 * downstream analytics already key off ISO timestamps.
 */
export const PROMPT_TEMPLATE_FINALISED_AT = '2026-06-07T00:00:00Z';

/**
 * Human-readable semantic version of the prompt template (rules + output
 * instruction + per-turn layout, treated as one artefact). Bumped on every
 * visible-to-the-model change:
 * - minor (`hybrid-v1.x`) for text-only edits within the same layout;
 * - major (`hybrid-v2.0`) for a layout restructure (a new/removed section, a
 *   changed numbering convention).
 *
 * Complements {@link hashSystemInstruction} (which is the deterministic
 * fingerprint of any byte change); the semantic version is the coarse,
 * human-meaningful identifier that makes cross-version analysis tractable.
 * Adopted per the 2026-05-26 harvester-team ask in
 * `solitaire-analytics/docs/reports/20260526_harvester_team_resign_hygiene_versioning_ask.md`.
 */
export const PROMPT_TEMPLATE_VERSION = 'hybrid-v1.6';

/** Build the full system instruction for a move-suggestion request. */
export function buildSystemInstruction(config: AIConfig): string {
  const parts = [RULES_PRIMER];
  if (config.includeStrategyGuidance) {
    parts.push(STRATEGY_GUIDANCE);
  }
  parts.push(OUTPUT_INSTRUCTION);
  return parts.join('\n\n');
}

/**
 * SHA-256 hex digest of an assembled system instruction. The boundary is the
 * full output of {@link buildSystemInstruction} — what the model actually sees
 * as its task framing, excluding the per-turn game-context JSON.
 *
 * SHA-256 (rather than the MD5 the offline audit happened to use) because it
 * is available natively via Web Crypto, needs no dependency, and is the
 * modern default for content identity. Async because Web Crypto is async;
 * the cost is sub-millisecond on a ~3 KB input and the call site is already
 * inside an awaited network round-trip.
 */
export async function hashSystemInstruction(systemInstruction: string): Promise<string> {
  const bytes = new TextEncoder().encode(systemInstruction);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
