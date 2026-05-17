/**
 * Assembles the system-instruction text for an AI request from the static
 * rule/strategy/output blocks, honoring the active configuration.
 *
 * @module ai/context/systemInstruction
 */

import type { AIConfig } from '../types';
import { OUTPUT_INSTRUCTION, RULES_PRIMER, STRATEGY_GUIDANCE } from './rulesPrimer';

/** Build the full system instruction for a move-suggestion request. */
export function buildSystemInstruction(config: AIConfig): string {
  const parts = [RULES_PRIMER];
  if (config.includeStrategyGuidance) {
    parts.push(STRATEGY_GUIDANCE);
  }
  parts.push(OUTPUT_INSTRUCTION);
  return parts.join('\n\n');
}
