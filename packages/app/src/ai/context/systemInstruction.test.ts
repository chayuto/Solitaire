/**
 * Tests for the system-instruction assembly and its identity fingerprint.
 *
 * The hash-snapshot tests are intentional tripwires: any change to the
 * underlying template blocks shifts the SHA-256 and the test fails, forcing
 * the developer to bump `PROMPT_TEMPLATE_FINALISED_AT` (and update the
 * snapshot below) in the same commit. This is the discipline that makes the
 * per-interaction `promptTemplateHash`/`…FinalisedAt` fields trustworthy
 * downstream — without it, the fields would be cosmetic.
 */

import { describe, it, expect } from 'vitest';
import {
  PROMPT_TEMPLATE_FINALISED_AT,
  PROMPT_TEMPLATE_VERSION,
  buildSystemInstruction,
  hashSystemInstruction,
} from './systemInstruction';
import type { AIConfig } from '../types';

/** Bare config: only the field that gates template content. */
function configWith(includeStrategyGuidance: boolean): AIConfig {
  return {
    includeStrategyGuidance,
    // Other AIConfig fields don't influence buildSystemInstruction, so the
    // type cast is sufficient for this test's scope.
  } as AIConfig;
}

describe('buildSystemInstruction', () => {
  it('includes RULES_PRIMER and OUTPUT_INSTRUCTION but not STRATEGY_GUIDANCE when guidance is off', () => {
    const text = buildSystemInstruction(configWith(false));
    expect(text).toContain('KLONDIKE SOLITAIRE RULES');
    expect(text).toContain('RESPONSE FORMAT');
    expect(text).not.toContain('STRATEGY GUIDANCE');
  });

  it('includes STRATEGY_GUIDANCE when guidance is on', () => {
    const text = buildSystemInstruction(configWith(true));
    expect(text).toContain('STRATEGY GUIDANCE');
  });
});

describe('hashSystemInstruction', () => {
  it('returns a 64-char lowercase hex SHA-256 digest', async () => {
    const hash = await hashSystemInstruction('hello');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    // Known value for "hello" — sanity check the algorithm.
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('is deterministic for the same input', async () => {
    const a = await hashSystemInstruction('the quick brown fox');
    const b = await hashSystemInstruction('the quick brown fox');
    expect(a).toBe(b);
  });
});

/**
 * Tripwire: pin the template fingerprints. If either snapshot below changes,
 * you've edited `RULES_PRIMER`, `STRATEGY_GUIDANCE`, or `OUTPUT_INSTRUCTION`
 * (or the assembly itself). Update the snapshot AND bump
 * `PROMPT_TEMPLATE_FINALISED_AT` to today's UTC date in the same change —
 * that pair is what the harvested dataset uses to attribute behaviour to a
 * specific prompt variant.
 */
describe('prompt template identity (tripwire)', () => {
  it('hash with strategy guidance is pinned', async () => {
    const hash = await hashSystemInstruction(buildSystemInstruction(configWith(true)));
    expect(hash).toBe('8971cad00d0b6cf1ccf18baf9053742a156a02583b30d19984b524b902ff51eb');
  });

  it('hash without strategy guidance is pinned', async () => {
    const hash = await hashSystemInstruction(buildSystemInstruction(configWith(false)));
    expect(hash).toBe('35efc0b832a453bbbb5421bcbb4eb0d677245b423fa2365f1cf70194ae935b9e');
  });

  it('PROMPT_TEMPLATE_FINALISED_AT is a valid ISO 8601 UTC instant', () => {
    expect(PROMPT_TEMPLATE_FINALISED_AT).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(Number.isFinite(new Date(PROMPT_TEMPLATE_FINALISED_AT).getTime())).toBe(true);
  });

  it('PROMPT_TEMPLATE_VERSION follows the hybrid-v{major}.{minor} semantic scheme', () => {
    // Per the 2026-05-26 versioning ask: minor bump for text-only edits
    // within the same layout (`hybrid-v1.x`); major bump for a layout
    // restructure (`hybrid-v2.0`). The exact value is what the dataset side
    // partitions on, so it is a tripwire — bump deliberately.
    expect(PROMPT_TEMPLATE_VERSION).toMatch(/^hybrid-v\d+\.\d+$/);
    expect(PROMPT_TEMPLATE_VERSION).toBe('hybrid-v1.1');
  });
});
