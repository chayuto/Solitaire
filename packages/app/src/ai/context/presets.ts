/**
 * Context verbosity presets for the AI advisor.
 *
 * A preset is a bundle of the optional context toggles in {@link AIConfig}.
 * The `custom` preset is not listed here — it simply leaves every toggle under
 * the user's direct control.
 *
 * @module ai/context/presets
 */

import type { AIConfig, AIContextPreset } from '../types';

/** The subset of {@link AIConfig} fields that a preset controls. */
export type PresetFields = Pick<
  AIConfig,
  | 'includeMoveHistory'
  | 'moveHistoryLimit'
  | 'includeGameMetrics'
  | 'includeStrategyGuidance'
  | 'includeHeuristicScores'
  | 'includeSeenDrawPileCards'
  | 'includeReasoningTrail'
  | 'reasoningTrailLimit'
>;

/** Toggle bundles for the three non-custom presets. */
export const PRESET_FIELDS: Record<Exclude<AIContextPreset, 'custom'>, PresetFields> = {
  // Cheapest: only the board and the legal moves.
  minimal: {
    includeMoveHistory: false,
    moveHistoryLimit: 0,
    includeGameMetrics: false,
    includeStrategyGuidance: false,
    includeHeuristicScores: false,
    includeSeenDrawPileCards: false,
    includeReasoningTrail: false,
    reasoningTrailLimit: 0,
  },
  // Balanced default.
  standard: {
    includeMoveHistory: true,
    moveHistoryLimit: 10,
    includeGameMetrics: true,
    includeStrategyGuidance: true,
    includeHeuristicScores: false,
    includeSeenDrawPileCards: true,
    includeReasoningTrail: true,
    reasoningTrailLimit: 5,
  },
  // Maximum quality: adds heuristic scores and a longer history.
  detailed: {
    includeMoveHistory: true,
    moveHistoryLimit: 15,
    includeGameMetrics: true,
    includeStrategyGuidance: true,
    includeHeuristicScores: true,
    includeSeenDrawPileCards: true,
    includeReasoningTrail: true,
    reasoningTrailLimit: 8,
  },
};

/** The default AI configuration for a fresh session. */
export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'gemini',
  model: 'gemma-4-31b-it',
  preset: 'standard',
  seeHiddenCards: false,
  ...PRESET_FIELDS.standard,
};

/**
 * Return a new config with a preset applied. For `custom`, the existing
 * toggles are kept untouched; provider/model/`seeHiddenCards` are always kept.
 */
export function applyPreset(config: AIConfig, preset: AIContextPreset): AIConfig {
  if (preset === 'custom') {
    return { ...config, preset };
  }
  return { ...config, preset, ...PRESET_FIELDS[preset] };
}
