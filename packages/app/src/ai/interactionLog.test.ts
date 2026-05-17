/**
 * Tests for the LLM interaction log.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordAIInteraction,
  getAIInteractions,
  getLastAIInteraction,
  clearAIInteractions,
  exportAIInteractions,
  type AIInteraction,
} from './interactionLog';
import { AI_INTERACTION_LOG_LIMIT } from './constants';

const base: AIInteraction = {
  id: 'id-1',
  requestId: 'req-abcdef12',
  attempt: 1,
  timestamp: 1,
  provider: 'gemini',
  model: 'gemma-4-31b-it',
  outcome: 'success',
  durationMs: 27_600,
  prompt: 'system + context',
  rawResponse: '{"final_decision":{"move_index":1}}',
  promptTokens: 852,
  thoughtTokens: 854,
  outputTokens: 53,
  totalTokens: 1759,
};

describe('interactionLog', () => {
  beforeEach(() => {
    clearAIInteractions();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('records and returns an interaction', () => {
    recordAIInteraction(base);
    expect(getAIInteractions()).toEqual([base]);
  });

  it('getLastAIInteraction returns the most recent entry', () => {
    expect(getLastAIInteraction()).toBeNull();
    recordAIInteraction(base);
    recordAIInteraction({ ...base, id: 'id-2', timestamp: 2 });
    expect(getLastAIInteraction()?.id).toBe('id-2');
  });

  it('logs token usage to the console for a success', () => {
    const info = vi.mocked(console.info);
    recordAIInteraction(base);
    expect(info.mock.calls.some((c) => String(c[0]).includes('total=1759'))).toBe(true);
  });

  it('logs a warning for an error outcome', () => {
    const warn = vi.mocked(console.warn);
    recordAIInteraction({
      ...base,
      id: 'id-err',
      outcome: 'error',
      errorKind: 'rate_limited',
      errorMessage: 'quota',
    });
    expect(warn.mock.calls.some((c) => String(c[0]).includes('rate_limited'))).toBe(true);
  });

  it('caps the ring buffer at the configured limit', () => {
    for (let i = 0; i < AI_INTERACTION_LOG_LIMIT + 25; i++) {
      recordAIInteraction({ ...base, id: `id-${i}`, timestamp: i });
    }
    expect(getAIInteractions()).toHaveLength(AI_INTERACTION_LOG_LIMIT);
    expect(getLastAIInteraction()?.timestamp).toBe(AI_INTERACTION_LOG_LIMIT + 24);
  });

  it('exportAIInteractions returns JSON with a count and the entries', () => {
    recordAIInteraction(base);
    const parsed = JSON.parse(exportAIInteractions());
    expect(parsed.count).toBe(1);
    expect(parsed.interactions).toHaveLength(1);
    expect(parsed.interactions[0].requestId).toBe('req-abcdef12');
    expect(typeof parsed.exportedAt).toBe('string');
  });

  it('clearAIInteractions empties the buffer', () => {
    recordAIInteraction(base);
    clearAIInteractions();
    expect(getAIInteractions()).toEqual([]);
  });
});
