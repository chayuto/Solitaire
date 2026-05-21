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
  sessionId: 'session-abcdef12',
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

  it('records an interaction, stamped with the build commit', () => {
    recordAIInteraction(base);
    const stored = getAIInteractions();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject(base);
    expect(stored[0].appCommit).toBeTruthy();
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

  it('warns exactly once when the buffer first overflows', () => {
    const warn = vi.mocked(console.warn);
    warn.mockClear(); // shed any cross-test history from the shared spy
    for (let i = 0; i < AI_INTERACTION_LOG_LIMIT + 5; i++) {
      recordAIInteraction({ ...base, id: `id-${i}`, timestamp: i });
    }
    const overflowWarns = warn.mock.calls.filter((c) =>
      String(c[0]).includes('interaction log reached'),
    );
    expect(overflowWarns).toHaveLength(1);
  });

  it('exportAIInteractions returns JSON with metadata and the entries', () => {
    recordAIInteraction(base);
    const parsed = JSON.parse(exportAIInteractions());
    expect(parsed.count).toBe(1);
    expect(parsed.interactions).toHaveLength(1);
    expect(parsed.interactions[0].requestId).toBe('req-abcdef12');
    expect(typeof parsed.exportedAt).toBe('string');
    // The export is stamped with the build commit for traceability.
    expect(typeof parsed.appCommit).toBe('string');
    expect(typeof parsed.appBuildTime).toBe('string');
  });

  it('exportAIInteractions embeds the session outcome summary when supplied', () => {
    recordAIInteraction(base);
    const parsed = JSON.parse(
      exportAIInteractions({
        sessionId: 'session-abcdef12',
        seed: 12345,
        model: 'gemma-4-31b-it',
        outcome: 'won',
        finalProgress: 100,
        moveCount: 142,
      }),
    );
    expect(parsed.session).toEqual({
      sessionId: 'session-abcdef12',
      seed: 12345,
      model: 'gemma-4-31b-it',
      outcome: 'won',
      finalProgress: 100,
      moveCount: 142,
    });
  });

  it('exportAIInteractions omits the session summary when none is supplied', () => {
    recordAIInteraction(base);
    const parsed = JSON.parse(exportAIInteractions());
    expect(parsed.session).toBeUndefined();
  });

  it('accepts stalled_auto_terminated as a session outcome', () => {
    recordAIInteraction(base);
    const parsed = JSON.parse(
      exportAIInteractions({
        sessionId: 'session-abcdef12',
        seed: 99,
        model: 'gemma-4-31b-it',
        outcome: 'stalled_auto_terminated',
        finalProgress: 42,
        moveCount: 88,
      }),
    );
    expect(parsed.session.outcome).toBe('stalled_auto_terminated');
  });

  it('carries stall-trigger telemetry on a stall_terminated event entry', () => {
    recordAIInteraction({
      ...base,
      id: 'id-stall',
      event: 'stall_terminated',
      plateauLength: 25,
      shuffleFraction: 0.72,
      moveTypeWindow: Array.from({ length: 25 }, () => 'tableau_to_tableau'),
    });
    const last = getLastAIInteraction();
    expect(last?.event).toBe('stall_terminated');
    expect(last?.plateauLength).toBe(25);
    expect(last?.shuffleFraction).toBe(0.72);
    expect(last?.moveTypeWindow).toHaveLength(25);
  });

  it('clearAIInteractions empties the buffer', () => {
    recordAIInteraction(base);
    clearAIInteractions();
    expect(getAIInteractions()).toEqual([]);
  });
});
